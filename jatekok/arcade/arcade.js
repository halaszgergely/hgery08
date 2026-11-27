/* HGWS Arcade – játéklista, kártyák, mélylinkek és online ranglista (klasszikus szkript, az arcade.html tölti be; a közös keret a jatekok/arcade/mag.js) */
'use strict';
const ZeroSpace = { id: 'zerospace', name: 'ZERO SPACE DEMO', ext: 'jatekok/zerospace/index.html', tag: 'DEMO',
  desc: 'Tervezd meg a saját űrhajódat modulról modulra, és vezesd csatába a végtelen űrben. Korai demó – az egyjátékos sandbox már elérhető.' };
const AranyLocsolofej = { id: 'aranylocsolofej', name: 'AZ ARANY LOCSOLÓFEJ', ext: 'jatekok/aranylocsolofej/index.html', tag: 'ÚJ',
  desc: 'Szikkadt Szilárd ellopta az Arany Locsolófejet! Hívd össze a csapatot, foglald el a víztornyot, és szerezd vissza a filmes kalandjátékban.' };
const Atemelotelep = { id: 'atemelotelep', name: 'AZ ÁTEMELŐTELEP', ext: 'jatekok/atemelotelep/index.html', tag: 'ÚJ', lbx: 1, icon: '🏭', fmt: v => { const t = Math.max(0, 1e6 - v); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); },
  desc: 'Éjszakai ügyelet egy szabotált szennyvízátemelőn: kapcsolószekrény, akna, PLC-program, aggregát – mielőtt túlcsordul a medence.' };
/* Öntöző Birodalom Online: a közösségi oldal #/birodalom nézete – a kártya a szülőoldalt navigálja oda */
const BoOnline = { id: 'boonline', name: 'ÖNTÖZŐ BIRODALOM ONLINE', go: '#/birodalom', ext: 1, tag: 'CLOSED BETA',
  desc: 'Közös világ 13 régióval: telkek, piac, vezetékek, szövetkezetek és heti ostrom Szikkadt Szilárd erődje ellen.' };
const LocsoloHaboru = { id: 'locsolohaboru', name: 'LOCSOLÓHÁBORÚ', ext: 'jatekok/locsolohaboru/index.html', tag: 'ONLINE',
  desc: 'Első személyű vízipisztoly-aréna 2–8 játékosnak: öt fegyver, négy pálya, négy mód – barátokkal vagy botok ellen.' };
const VizagyuIo = { id: 'vizagyuio', name: 'VÍZÁGYÚ.IO', ext: 'jatekok/vizagyuio/index.html', tag: 'ONLINE',
  desc: 'Valós idejű locsolóaréna 2–8 játékosnak: hívd meg a barátaidat, vagy gyakorolj botok ellen. Négy mód, négy pálya.' };
const ZeroChip = { id: 'zerochip', name: 'ZERO CHIP', ext: 'jatekok/zerochip/index.html', tag: 'ÚJ',
  desc: 'Építs áramköröket a tranzisztortól a processzor számlálójáig. 61 küldetés: szilícium, logikai kapuk, összeadók, memória, majd haladó chiptervezés.' };
/* zárt béta: csak adminok és „Béta-tesztelő” taggel rendelkezők látják és indíthatják (a jogosultságot a főoldal küldi) */
const ZeroQuest = { id: 'zeroquest', name: 'ZERO QUEST', ext: 'jatekok/zeroquest/index.html', tag: 'ZÁRT BÉTA', lock: 1,
  desc: 'Felülnézetes akció-szerepjáték Hajnalrév völgyében: küldetések, szintlépés, felszerelés és egy ébredő őr a romok alatt. Zárt béta.' };
const Kohovar = { id: 'kohovar', name: 'KOHÓVÁR', ext: 'jatekok/kohovar/index.html', tag: 'ÚJ', lbx: 1, icon: '⛏️', fmt: v => Math.floor(v) + '. hullám',
  desc: 'Bányássz, építs szállítószalagokat, gyárakat és áramhálózatot, és védd meg a magot a hullámokban érkező ellenség ellen. Óriási barlangtérképek, három kampány és szabad játék. A Mindustry alapján készült.' };
const Drift = window.HGDrift ? window.HGDrift({ G, Sfx, rr, store, hud }) : null;
const Zombi = window.HGZombi ? window.HGZombi({ G, Sfx, rr, store, hud }) : null;
const Vasut = { id: 'vasut', name: 'DERAIL HUNGARY', ext: 'jatekok/vasut/index.html', tag: 'ÚJ', lbx: 1, icon: '🚂', fmt: v => Math.floor(v).toLocaleString('hu-HU') + ' Ft',
  desc: 'Teherfuvarozás Magyarország valódi, 8400 km-es vasúthálózatán: kocsik, váltók, menetrend, mozdonyok és engedélyek.' };
const Szerver = { id: 'szerver', name: 'CABLE HORROR', ext: 'jatekok/szerver/index.html', tag: 'ÚJ', lbx: 1, icon: '🖥️', fmt: v => Math.floor(v).toLocaleString('hu-HU') + ' Ft',
  desc: 'Garázsszervertől az adatközpontig: építs szervert alkatrészekből, kábelezd be a racket, szerezz ügyfeleket és bányássz.' };
const LegiOntozes = { id: 'flightsim', name: 'HGWS LÉGI ÖNTÖZÉS', ext: 'jatekok/legiontozes/index.html', tag: 'ÚJ', lbx: 1, icon: '✈️', fmt: v => Math.floor(v).toLocaleString('hu-HU') + ' p',
  desc: '3D repülőszimulátor egész Magyarország felett: 17 öntözőgép, mezőöntözés, erdőtüzek, precíziós célok és vízikarikák a miskolci bázisról.' };
const Vizfuvar = { id: 'vizfuvar', name: 'HGWS VÍZFUVAR', ext: 'jatekok/vizfuvar/index.html', tag: 'ÚJ', lbx: 1, icon: '🚚', fmt: v => Math.floor(v).toLocaleString('hu-HU') + ' Ft',
  desc: 'Vízszállító-szimulátor Miskolc valódi utcáin: Babettóval egyetlen ballonnal kezded, aztán Trabóval, később tartálykocsival és kamionnal építed a HGWS flottáját.' };
const LocsoloVaros = { id: 'locsolovaros', name: 'HGWS: LOCSOLÓ VÁROS', ext: 'jatekok/locsolovaros/index.html', tag: 'ÚJ', icon: '🏙️',
  desc: 'Nyitott világú akciójáték egy kitalált, Miskolc ihlette városban: Halász Gergelyként vízfegyverekkel szállsz szembe Szilárddal, vezetsz Trabantot, Ikarust, helikoptert – és egy tankot.' };
const WaterBlast = { id: 'waterblast', name: 'HGWS WATER BLAST', ext: 'jatekok/waterblast/index.html', tag: 'ÚJ', lbx: 1, icon: '💧', fmt: v => Math.floor(v).toLocaleString('hu-HU') + ' p',
  desc: 'Blokk-kirakós 8×8-as táblán, HGWS-víztömbökkel: rakd le a három elemet, a teli sorok és oszlopok vízzé válnak. Kombók, sorozatok, tiszta tábla.' };
const GAMES = [Locsolo, Nyomas, Anya, Vizagyu, Csepp, Ugro, Torony, Birodalom, BoOnline, Aszaly, ...(Drift ? [Drift] : []), ...(Zombi ? [Zombi] : []), AranyLocsolofej, Atemelotelep, Vasut, Szerver, Kohovar, LegiOntozes, Vizfuvar, LocsoloVaros, WaterBlast, LocsoloHaboru, VizagyuIo, ZeroSpace, ZeroChip, ZeroQuest];
const NOSPON = ['locsolo', 'vizagyu', 'csepp', 'vizfuvar'];
GAMES.forEach(g => { if (NOSPON.includes(g.id)) delete g.sponsor; else g.sponsor = 'A Zerosites támogatásával'; });
/* népszerűség: a főoldal küldi a játékonkénti indításszámot (plays), helyben is megjegyezzük a gyors sorrendhez */
let PLAYS = (() => { try { return JSON.parse(localStorage.getItem('hgws_plays') || '{}') || {}; } catch (_) { return {}; } })();
const byPop = l => l.map((g, i) => [g, i]).sort((a, b) => (PLAYS[b[0].id] || 0) - (PLAYS[a[0].id] || 0) || a[1] - b[1]).map(x => x[0]);
function popOrder() { const wrap = $('#games'); if (!wrap.children.length) return; const els = [...wrap.children]; byPop(GAMES).forEach((g, i) => { const el = els.find(x => x.dataset.id === g.id); if (el) { wrap.appendChild(el); el.querySelector('.tag').textContent = String(i + 1).padStart(2, '0'); } }); }
const launch = gm => { if (window.top !== window) parent.postMessage({ hgws: 'play', game: gm.id }, location.origin); openGame(gm); };
const EXT = $('#ext'); let EXF = $('#extf');
// a külön oldalon futó játékok (pl. Az Átemelőtelep) eredménye ide érkezik, innen megy tovább a ranglistára
addEventListener('message', e => { if (e.origin !== location.origin || e.source !== EXF.contentWindow || !e.data || e.data.hgws !== 'score') return; const g = GAMES.find(x => x.id === e.data.game && x.lbx); if (!g || !(e.data.score > 0)) return;
  if (e.data.score > store.get('best_' + g.id)) store.set('best_' + g.id, e.data.score); if (window.top !== window) parent.postMessage({ hgws: 'score', game: g.id, score: e.data.score }, location.origin); });
let zqWait = false;
// a külön oldalon futó játék felhőmentés-üzeneteit továbbadjuk a főoldalnak (ott van a bejelentkezés), a választ pedig vissza a játéknak
addEventListener('message', e => { if (e.origin !== location.origin || !e.data) return; const h = e.data.hgws;
  if (e.source === EXF.contentWindow && (h === 'csreq' || h === 'cssave' || h === 'csdel')) { if (window.top !== window) parent.postMessage(e.data, location.origin); else if (h === 'csreq') EXF.contentWindow.postMessage({ hgws: 'cs', game: e.data.game, none: 1 }, location.origin); return; }
  if (window.top !== window && e.source === parent && h === 'cs' && !EXT.hidden && EXF.contentWindow && !GAMES.some(x => !x.ext && x.id === e.data.game)) EXF.contentWindow.postMessage(e.data, location.origin); });
function openExt(gm) { if (gm.go) { if (window.top !== window) parent.postMessage({ hgws: 'nav', to: gm.go }, location.origin); else location.href = './' + gm.go; return; } if (gm.lock && !window.HGZQ_OK) { zqWait = !window.HGZQ_SEEN; return; } { const f = EXF.cloneNode(); f.src = gm.ext + '?v=' + Date.now().toString(36).slice(0, 5) + (gm.room ? '&room=' + encodeURIComponent(gm.room) : ''); EXF.replaceWith(f); EXF = f; window.HGWS_GATE?.(f); } /* új iframe: így a főoldal a hangját is kezelni tudja (fül némítása) */ gm.room = ''; EXT.hidden = false; document.body.classList.add('locked'); setTimeout(() => { try { EXF.focus(); } catch (_) {} }, 300); }
/* a régi lista megszűnt: beágyazva kilépéskor (vagy játék nélkül) a főoldal új Arcade-listájára megyünk */
function toList() { if (/[?&]bo=/.test(location.search)) return; if (window.top !== window) { try { parent.postMessage({ hgws: 'nav', to: '#/arcade' }, location.origin); } catch (_) {} } else if (!/[?&]solo/.test(location.search)) location.replace('./#/arcade'); }
window.HGWS_TO_LIST = toList;
function closeExt() { EXT.hidden = true; EXF.src = 'about:blank'; document.body.classList.remove('locked'); toList(); }
$('#extX').onclick = closeExt;
const ARTS = {
  boonline: (c, x, t) => { const W = c.width, H = c.height, g = x.createRadialGradient(W * .4, H * .6, 10, W / 2, H / 2, W * .7); g.addColorStop(0, '#12305a'); g.addColorStop(1, '#060c18'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const N = [[160, 70, '#e8b656', 15], [95, 92, '#5ee08a', 12], [45, 45, '#7fa878', 10], [120, 128, '#4dd6c7', 10], [215, 105, '#c9a24a', 10], [255, 125, '#e0a05a', 11], [270, 70, '#ffa94d', 10], [200, 28, '#ff8fc7', 10], [130, 20, '#9fd6f5', 10], [300, 30, '#c79bff', 9]];
    const E = [[0, 1], [0, 4], [0, 7], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 9], [7, 8], [2, 8]];
    x.lineWidth = 2; x.setLineDash([2, 6]); x.strokeStyle = 'rgba(140,200,255,.3)'; for (const [a, b] of E) { x.beginPath(); x.moveTo(N[a][0], N[a][1]); x.lineTo(N[b][0], N[b][1]); x.stroke(); } x.setLineDash([]);
    x.strokeStyle = '#e8b656'; x.lineWidth = 3; for (const [a, b] of [[0, 1], [4, 5]]) { x.beginPath(); x.moveTo(N[a][0], N[a][1]); x.lineTo(N[b][0], N[b][1]); x.stroke();
      const k = (t * .6) % 1; x.fillStyle = '#9fdcff'; x.beginPath(); x.arc(N[a][0] + (N[b][0] - N[a][0]) * k, N[a][1] + (N[b][1] - N[a][1]) * k, 3, 0, 6.283); x.fill(); }
    for (const [px, py, col, r] of N) { x.fillStyle = col + '44'; x.strokeStyle = col; x.lineWidth = 2.5; x.beginPath(); x.arc(px, py, r * (1 + .06 * Math.sin(t * 2 + px)), 0, 6.283); x.fill(); x.stroke(); }
    x.fillStyle = '#fff3c4'; x.font = '800 15px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🏛', N[0][0], N[0][1] + 1); },
  aszaly: (c, x, t) => Aszaly.art(c, x, t),
  drift: (c, x, t) => Drift && Drift.art(c, x, t),
  holtvaros: (c, x, t) => Zombi && Zombi.art(c, x, t),
  birodalom: (c, x, t) => { const W = c.width, H = c.height, s = 22, ox = (W - s * 11) / 2, oy = (H - s * 5) / 2; x.fillStyle = '#0f2a1a'; x.fillRect(0, 0, W, H);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 11; q++) { x.fillStyle = (q + r) & 1 ? '#3b7a33' : '#367230'; x.fillRect(ox + q * s, oy + r * s, s, s); }
    x.fillStyle = 'rgba(40,110,170,.3)'; x.fillRect(ox + 2 * s, oy, s * 3, s * 3); x.fillRect(ox + 6 * s, oy + 2 * s, s * 3, s * 3);
    x.fillStyle = '#6f8fae'; x.fillRect(ox - 8, oy + 2.4 * s, s * 7.5 + 8, s * .22); x.fillRect(ox + 3.4 * s, oy + 1.5 * s, s * .22, s);
    for (const [q, r] of [[3, 1], [7, 3]]) { const cx = ox + q * s + s / 2, cy = oy + r * s + s / 2; x.fillStyle = '#e8b656'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.283); x.fill();
      x.strokeStyle = `rgba(150,215,255,${.35 + .2 * Math.sin(t * 6)})`; for (let j = 0; j < 8; j++) { const a = j * .785, rr2 = s * (.6 + .6 * ((t + j * .3) % 1)); x.beginPath(); x.arc(cx, cy, rr2, a - .2, a + .2); x.stroke(); } }
    for (const [q, r, col] of [[2, 0, '#e5533d'], [4, 0, '#e5533d'], [2, 2, '#ff6fa8'], [4, 1, '#9be36a'], [6, 3, '#ffa531'], [8, 4, '#8e5bd6'], [6, 2, '#ffa531'], [8, 2, '#8e5bd6']]) {
      const cx = ox + q * s + s / 2, cy = oy + r * s + s / 2, k = .7 + .3 * Math.sin(t * 2 + q); x.fillStyle = '#4fae46'; x.beginPath(); x.arc(cx, cy, 7 * k, 0, 6.283); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(cx + 2, cy - 2, 2.6 * k, 0, 6.283); x.fill(); } },
  zeroquest: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#14261c'); g.addColorStop(1, '#2f5a34'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const px = (i * 41 + 12) % W, py = 30 + (i * 53) % (H - 50); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(px + 3, py + 14, 13, 4, 0, 0, 6.283); x.fill(); x.fillStyle = i & 1 ? '#2f6b34' : '#3f8a3f'; x.beginPath(); x.arc(px, py, 13, 0, 6.283); x.fill(); x.fillStyle = 'rgba(160,220,120,.35)'; x.beginPath(); x.arc(px - 4, py - 4, 6, 0, 6.283); x.fill(); }
    const cx = W / 2, cy = H / 2 + 8, a = Math.sin(t * 3) * 1.2; x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(cx, cy + 18, 14, 5, 0, 0, 6.283); x.fill(); x.fillStyle = '#3f6fb5'; x.beginPath(); x.ellipse(cx, cy + 2, 10, 13, 0, 0, 6.283); x.fill(); x.fillStyle = '#f0c9a4'; x.beginPath(); x.arc(cx, cy - 15, 8, 0, 6.283); x.fill(); x.fillStyle = '#6b3f1f'; x.beginPath(); x.arc(cx, cy - 17, 8, 3.14, 6.283); x.fill();
    x.save(); x.translate(cx + 10, cy + 2); x.rotate(a - .6); x.fillStyle = '#e3ebf2'; x.fillRect(2, -1.6, 30, 3.2); x.fillStyle = '#e8b656'; x.fillRect(0, -5, 3, 10); x.restore(); x.strokeStyle = `rgba(255,255,255,${.5 + .4 * Math.sin(t * 3)})`; x.lineWidth = 3; x.beginPath(); x.arc(cx + 10, cy + 2, 34, a - 1.2, a - .2); x.stroke();
    const sx = cx + 70, sy = cy + 10 - Math.abs(Math.sin(t * 5)) * 6; x.fillStyle = '#6fc24a'; x.beginPath(); x.moveTo(sx - 15, sy + 10); x.bezierCurveTo(sx - 16, sy - 14, sx + 16, sy - 14, sx + 15, sy + 10); x.fill(); x.fillStyle = '#12301a'; x.fillRect(sx - 6, sy - 2, 3, 5); x.fillRect(sx + 3, sy - 2, 3, 5); },
  aranylocsolofej: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1430'); g.addColorStop(.7, '#3a2a5a'); g.addColorStop(1, '#a8552e'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 22; i++) x.fillRect((i * 73) % W, (i * 37) % 70, 1.5, 1.5);
    x.fillStyle = '#0a0f1c'; x.beginPath(); x.moveTo(40, H); x.lineTo(46, 62); x.lineTo(66, 62); x.lineTo(72, H); x.fill(); x.beginPath(); x.roundRect(24, 26, 64, 38, 8); x.fill(); x.beginPath(); x.moveTo(22, 28); x.lineTo(56, 8); x.lineTo(90, 28); x.fill(); x.fillRect(0, H - 14, W, 14);
    const cx = W / 2 + 10, cy = 96, gl = x.createRadialGradient(cx, cy - 26, 2, cx, cy - 26, 70); gl.addColorStop(0, `rgba(255,226,154,${.55 + .15 * Math.sin(t * 3)})`); gl.addColorStop(1, 'rgba(255,226,154,0)'); x.fillStyle = gl; x.fillRect(cx - 80, cy - 100, 160, 150);
    x.strokeStyle = 'rgba(255,243,196,.55)'; x.lineWidth = 1.5; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + t * .5; x.beginPath(); x.moveTo(cx + Math.cos(a) * 30, cy - 26 + Math.sin(a) * 30); x.lineTo(cx + Math.cos(a) * 44, cy - 26 + Math.sin(a) * 44); x.stroke(); }
    const G = x.createLinearGradient(cx - 18, 0, cx + 18, 0); G.addColorStop(0, '#a8702a'); G.addColorStop(.4, '#fff3c4'); G.addColorStop(1, '#a8702a'); x.fillStyle = G; x.fillRect(cx - 5, cy - 22, 10, 22); x.fillRect(cx - 13, cy - 2, 26, 6); x.beginPath(); x.moveTo(cx - 8, cy - 22); x.lineTo(cx + 8, cy - 22); x.lineTo(cx + 15, cy - 36); x.lineTo(cx - 15, cy - 36); x.fill(); x.beginPath(); x.ellipse(cx, cy - 38, 18, 7, 0, 0, 6.283); x.fill();
    x.fillStyle = '#7a2f3a'; x.fillRect(cx - 34, cy + 4, 68, 30); x.fillStyle = '#e8b656'; x.fillRect(cx - 38, cy, 76, 5); x.strokeStyle = 'rgba(200,235,255,.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 30, cy); x.lineTo(cx - 30, cy - 46); x.arc(cx, cy - 46, 30, Math.PI, 0); x.lineTo(cx + 30, cy); x.stroke();
    for (let k = 0; k < 6; k++) { const o = (t * .5 + k / 6) % 1, px = cx - 110 + k * 44 + Math.sin(k * 3) * 10, py = 20 + o * 100; x.fillStyle = `rgba(108,198,255,${.9 - o * .6})`; x.beginPath(); x.moveTo(px, py - 7); x.bezierCurveTo(px + 6, py, px + 5, py + 6, px, py + 6); x.bezierCurveTo(px - 5, py + 6, px - 6, py, px, py - 7); x.fill(); } },
  vasut: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#1b2a1c'; x.fillRect(0, 0, W, H); x.lineCap = 'round';
    const P = u => [W * (-.1 + u * 1.2), H * (.62 - .28 * Math.sin(u * 3.2) + .08 * Math.sin(u * 9))];
    x.strokeStyle = '#2f5f8f'; x.lineWidth = 6; x.beginPath(); x.moveTo(W * .3, 0); x.quadraticCurveTo(W * .45, H * .5, W * .35, H); x.stroke();
    x.strokeStyle = '#7a7466'; x.lineWidth = 2; x.beginPath(); x.moveTo(W * .55, H); x.lineTo(W * .7, H * .45); x.lineTo(W * 1.1, H * .3); x.stroke();
    x.strokeStyle = '#a9b4c2'; x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= 60; i++) { const [a, b] = P(i / 60); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke();
    const u0 = (t * .05) % 1.3 - .15, cols = ['#3b3b3b', '#c9a24a', '#2e7d6b', '#8a5a2b', '#6d4a8f'];
    for (let k = 5; k >= 0; k--) { const u = u0 - k * .035, [a, b] = P(u), [a2, b2] = P(u + .03); x.save(); x.translate((a + a2) / 2, (b + b2) / 2); x.rotate(Math.atan2(b2 - b, a2 - a)); x.fillStyle = '#000'; x.fillRect(-Math.hypot(a2 - a, b2 - b) / 2 - 1, -5, Math.hypot(a2 - a, b2 - b) + 2, 10); x.fillStyle = k ? cols[k - 1] : '#4f7fbf'; x.fillRect(-Math.hypot(a2 - a, b2 - b) / 2, -4, Math.hypot(a2 - a, b2 - b), 8); if (!k) { x.fillStyle = '#ffe29a'; x.fillRect(Math.hypot(a2 - a, b2 - b) / 2 - 3, -4, 3, 8); } x.restore(); }
    for (const [u, n] of [[.18, 'Kelenföld'], [.62, 'Szolnok']]) { const [a, b] = P(u); x.fillStyle = '#e8b656'; x.beginPath(); x.arc(a, b, 4, 0, 6.283); x.fill(); x.font = '700 10px Inter,sans-serif'; x.fillStyle = '#e6e6e6'; x.textAlign = 'center'; x.fillText(n, a, b - 9); } },
  szerver: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#10161d'; x.fillRect(0, 0, W, H); const rw = W * .34, n = 7, uh = H * .1;
    for (const rx of [W * .12, W * .54]) { x.fillStyle = '#0a0c0f'; x.fillRect(rx - 5, H * .1, rw + 10, n * uh + 10); for (let i = 0; i < n; i++) { const y = H * .1 + 5 + i * uh; x.fillStyle = i % 3 === 2 ? '#22364a' : '#3a4048'; x.fillRect(rx, y, rw, uh - 3);
        for (let k = 0; k < 6; k++) { x.fillStyle = Math.sin(t * 6 + i * 2.1 + k * 1.3 + rx) > .1 ? '#5ee08a' : '#1d3b28'; x.fillRect(rx + 6 + k * 7, y + uh * .45, 3, 2); } } }
    x.lineWidth = 2; ['#3d8bfd', '#f59f00', '#e64980'].forEach((col, i) => { x.strokeStyle = col; x.beginPath(); x.moveTo(W * .12 + rw - 8, H * (.2 + i * .2)); x.bezierCurveTo(W * .5, H * (.5 + i * .2), W * .5, H * (.55 + i * .1), W * .54 + rw - 8, H * (.3 + i * .2)); x.stroke(); }); },
  flightsim: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3f86d6'); g.addColorStop(.62, '#bcd8ee'); g.addColorStop(.62, '#8a9a4c'); g.addColorStop(1, '#5d7a38'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const cols = ['#c8b26a', '#8a6a48', '#6f8f3e', '#a99a5a', '#7c9a4c']; for (let i = 0; i < 9; i++) { x.fillStyle = cols[i % 5]; x.beginPath(); const y0 = H * .62 + i * i * 1.6, y1 = H * .62 + (i + 1) * (i + 1) * 1.6; x.moveTo(0, y0); x.lineTo(W, y0 - 6); x.lineTo(W, y1 - 6); x.lineTo(0, y1); x.fill(); }
    const px = W * (.15 + ((t * .08) % 1) * .9), py = H * .34 + Math.sin(t * 1.3) * 6; x.fillStyle = 'rgba(210,235,255,.55)'; for (let i = 0; i < 26; i++) { const k = i / 26; x.fillRect(px - 8 - k * 70 + Math.sin(i * 7 + t * 9) * 3, py + 6 + k * 46, 3, 3); }
    x.save(); x.translate(px, py); x.fillStyle = '#f2c230'; x.fillRect(-20, -3, 40, 6); x.fillRect(-4, -14, 9, 28); x.fillStyle = '#2f9e4f'; x.fillRect(16, -9, 5, 9); x.fillStyle = '#2aa7d9'; x.fillRect(-6, -1, 14, 2); x.restore();
    x.fillStyle = '#fff'; x.font = '900 13px Inter, Arial'; x.fillText('HGWS', 10, 20); },
  vizfuvar: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6fa6d8'); g.addColorStop(.5, '#cfe0ec'); g.addColorStop(.5, '#6f8f45'); g.addColorStop(1, '#4f6e33'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#3a3c3f'; x.beginPath(); x.moveTo(W * .44, H * .5); x.lineTo(W * .56, H * .5); x.lineTo(W * .95, H); x.lineTo(W * .05, H); x.fill(); x.fillStyle = '#efe9da'; for (let i = 0; i < 6; i++) { const k = ((i / 6 + t * .35) % 1), y = H * .5 + k * k * H * .5, w = 1 + k * 5; x.fillRect(W / 2 - w / 2, y, w, 2 + k * 12); }
    for (let i = 0; i < 5; i++) { x.fillStyle = ['#d9cfb8', '#c9b89a', '#e3dccb'][i % 3]; x.fillRect(W * (.02 + i * .07), H * (.26 + (i % 2) * .06), W * .06, H * (.24 - (i % 2) * .06)); x.fillRect(W * (.66 + i * .07), H * (.3 - (i % 2) * .05), W * .06, H * (.2 + (i % 2) * .05)); }
    const bx = W * .5, by = H * .76 + Math.sin(t * 6) * 1.5; x.fillStyle = '#f2c230'; x.beginPath(); x.roundRect(bx - 34, by - 26, 68, 30, 8); x.fill(); x.fillStyle = '#2f9e4f'; x.beginPath(); x.roundRect(bx - 26, by - 44, 52, 20, 6); x.fill();
    x.fillStyle = '#1a2a33'; x.fillRect(bx - 22, by - 40, 44, 12); x.fillStyle = '#15181c'; x.fillRect(bx - 32, by + 2, 12, 9); x.fillRect(bx + 20, by + 2, 12, 9); x.fillStyle = '#d01010'; x.fillRect(bx - 30, by - 18, 10, 6); x.fillRect(bx + 20, by - 18, 10, 6);
    x.fillStyle = 'rgba(95,183,230,.85)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.roundRect(bx - 18 + i * 13, by - 36, 9, 12, 3); x.fill(); }
    x.fillStyle = '#fff'; x.font = '900 13px Inter, Arial'; x.fillText('HGWS', 10, 20); },
  waterblast: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1a33'); g.addColorStop(1, '#040912'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const P = ['#2a8fe0', '#e8b656', '#3fbf63', '#22c6c0', '#ff8a2a', '#9b6bff', '#ff5a4d'], s = Math.min(W, H) / 7.2, ox = W / 2 - s * 3, oy = H / 2 - s * 3, cl = Math.floor(t * .8) % 6;
    for (let y = 0; y < 6; y++) for (let k = 0; k < 6; k++) { const on = (k * 7 + y * 3) % 5 !== 0; const X = ox + k * s, Y = oy + y * s; x.fillStyle = 'rgba(42,143,224,.1)'; x.beginPath(); x.roundRect(X + 2, Y + 2, s - 4, s - 4, s * .16); x.fill();
      if (!on && y !== cl) continue; const pulse = y === cl ? .5 + .5 * Math.sin(t * 8) : 0, col = P[(k + y * 2) % 7]; x.fillStyle = col; x.globalAlpha = 1 - pulse * .5; x.beginPath(); x.roundRect(X + 2, Y + 2, s - 4, s - 4, s * .16); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.roundRect(X + s * .15, Y + s * .12, s * .7, s * .26, s * .1); x.fill(); x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(X + s / 2, Y + s * .58, s * .12, 0, 6.3); x.fill(); x.globalAlpha = 1; }
    x.fillStyle = '#e8b656'; x.font = '900 15px Inter, Arial'; x.textAlign = 'center'; x.fillText('WATER BLAST', W / 2, oy - 6); x.textAlign = 'left'; },
  locsolovaros: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b3f7a'); g.addColorStop(.55, '#f29a5a'); g.addColorStop(.55, '#3a3d42'); g.addColorStop(1, '#2a2c30'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const bw = W * .09, bh = H * (.22 + ((i * 37) % 5) * .055), bx = i * W * .115 - W * .02; x.fillStyle = ['#c9a25e', '#b5654e', '#8a95a3', '#d2b884'][i % 4]; x.fillRect(bx, H * .55 - bh, bw, bh);
      x.fillStyle = 'rgba(255,214,120,.85)'; for (let r = 0; r < bh / 9 - 1; r++) for (let k = 0; k < 3; k++) if ((i * 7 + r * 3 + k) % 4) x.fillRect(bx + 4 + k * bw / 3.3, H * .55 - bh + 5 + r * 9, bw / 6, 4); }
    x.fillStyle = '#ffc83d'; const sx = W * .78, sy = H * .55 - H * .36; x.fillRect(sx - 2, sy, 4, 18); x.beginPath(); x.arc(sx, sy, 7, 0, 6.3); x.fill(); x.save(); x.translate(sx, sy - 9); x.rotate(t * 2); x.fillRect(-12, -1.5, 24, 3); x.restore();
    x.fillStyle = '#efe9da'; for (let i = 0; i < 6; i++) { const k = ((i / 6 + t * .4) % 1), y = H * .56 + k * k * H * .44; x.fillRect(W / 2 - 1 - k * 2, y, 2 + k * 4, 2 + k * 10); }
    const cx = W * .5 + Math.sin(t * 1.4) * W * .08, cy = H * .8; x.fillStyle = '#9fd0c8'; x.beginPath(); x.roundRect(cx - 30, cy - 16, 60, 24, 9); x.fill(); x.beginPath(); x.roundRect(cx - 18, cy - 30, 36, 16, 6); x.fill(); x.fillStyle = '#1d2a33'; x.fillRect(cx - 14, cy - 27, 28, 10);
    x.fillStyle = '#15181c'; x.fillRect(cx - 26, cy + 6, 11, 8); x.fillRect(cx + 15, cy + 6, 11, 8); x.fillStyle = '#d01010'; x.fillRect(cx - 27, cy - 10, 8, 5); x.fillRect(cx + 19, cy - 10, 8, 5);
    x.fillStyle = 'rgba(160,215,255,.85)'; for (let i = 0; i < 14; i++) { const k = ((t * 1.6 + i / 14) % 1); x.beginPath(); x.arc(W * .14 + k * W * .3, H * .74 - Math.sin(k * Math.PI) * H * .22, 2 + k * 2, 0, 6.3); x.fill(); }
    const b = Math.floor(t * 3) % 2; x.fillStyle = b ? '#3a7bff' : '#ff3a3a'; x.fillRect(W * .86, H * .06, 8, 8); x.fillStyle = b ? '#ff3a3a' : '#3a7bff'; x.fillRect(W * .9, H * .06, 8, 8);
    x.fillStyle = '#ffd23a'; x.font = '900 14px Inter, Arial'; x.fillText('★★★', 10, 20); },
  atemelotelep: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#05070b'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(150,170,200,.25)'; for (let i = 0; i < 60; i++) { const rx = (i * 53.7) % W, ry = ((i * 31.3) + t * 140) % H; x.fillRect(rx, ry, 1, 7); }
    x.fillStyle = '#1a1d22'; x.fillRect(W * .12, H * .42, W * .36, H * .4); x.fillStyle = '#2a2d33'; x.fillRect(W * .6, H * .62, W * .3, H * .2); x.fillStyle = Math.sin(t * 3) > 0 ? '#ff3a2a' : '#4a1010'; x.beginPath(); x.arc(W * .3, H * .4, 5, 0, 6.283); x.fill();
    const a = Math.sin(t * .8) * .35 - .2, gx = W * .55, gy = H * .95, gr = x.createRadialGradient(gx + Math.cos(a - 1.57) * H * .6, gy + Math.sin(a - 1.57) * H * .6, 2, gx + Math.cos(a - 1.57) * H * .6, gy + Math.sin(a - 1.57) * H * .6, H * .35); gr.addColorStop(0, 'rgba(255,240,200,.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = '#7fff9a'; x.font = '700 10px monospace'; x.fillText('LT1 ' + (2.9 + Math.sin(t) * .3).toFixed(2) + ' m', W * .63, H * .74); },
  locsolohaboru: (c, x, t) => { const W = c.width, H = c.height, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8fc6ea'); g.addColorStop(.55, '#cfe6f2'); g.addColorStop(.56, '#5fa04e'); g.addColorStop(1, '#3f7a35'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#2c7d36'; x.fillRect(W * .08, H * .38, W * .22, H * .2); x.fillStyle = '#c9a66b'; x.fillRect(W * .68, H * .3, W * .2, H * .27); x.fillStyle = '#8a4b2e'; x.fillRect(W * .66, H * .27, W * .24, H * .05);
    const ex = W * .46 + Math.sin(t * 1.3) * W * .12; x.fillStyle = '#2a2f38'; x.fillRect(ex - 6, H * .44, 12, 18); x.fillStyle = '#ff7a6e'; x.fillRect(ex - 8, H * .34, 16, 14); x.fillStyle = '#f0c9a0'; x.fillRect(ex - 5, H * .27, 10, 9);
    x.fillStyle = 'rgba(190,230,255,.95)'; for (let i = 0; i < 12; i++) { const k = (t * 1.6 + i / 12) % 1, px = W * .72 + (ex - W * .72) * k, py = H * .86 + (H * .38 - H * .86) * k - Math.sin(k * 3.1) * 12; x.beginPath(); x.arc(px, py, 3.2 - k * 1.5, 0, 6.283); x.fill(); }
    x.fillStyle = '#3f9a4a'; x.beginPath(); x.moveTo(W * .66, H); x.lineTo(W * .76, H * .8); x.lineTo(W * .86, H * .84); x.lineTo(W * .8, H); x.fill(); x.fillStyle = '#ffd84a'; x.fillRect(W * .72, H * .82, 10, 8); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(W / 2 - 7, H / 2); x.lineTo(W / 2 + 7, H / 2); x.moveTo(W / 2, H / 2 - 7); x.lineTo(W / 2, H / 2 + 7); x.stroke(); },
  vizagyuio: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#2f6b3a'; x.fillRect(0, 0, W, H); x.fillStyle = '#285e33'; for (let i = 0; i < W; i += 40) for (let j = (i / 40 % 2) * 40; j < H; j += 80) x.fillRect(i, j, 40, 40);
    const car = (px, py, a, col) => { x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = '#1a2230'; x.fillRect(-15, -11, 30, 22); x.fillStyle = col; x.fillRect(-13, -9, 26, 18); x.fillStyle = '#c3ced9'; x.fillRect(4, -3, 18, 6); x.restore(); };
    const a1 = Math.sin(t * .9) * .4, p1 = [W * .28, H * .5 + Math.sin(t * 1.3) * 18], p2 = [W * .72, H * .5 + Math.cos(t * 1.1) * 18]; car(p1[0], p1[1], a1, '#6cc6ff'); car(p2[0], p2[1], Math.PI + Math.sin(t * .7) * .4, '#ff7a6e');
    x.fillStyle = 'rgba(170,225,255,.95)'; for (let i = 0; i < 7; i++) { const k = ((t * 2.2 + i / 7) % 1); x.beginPath(); x.arc(p1[0] + Math.cos(a1) * (24 + k * W * .34), p1[1] + Math.sin(a1) * (24 + k * W * .34), 3, 0, 6.283); x.fill(); } },
  kohovar: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#4b4c51'; x.fillRect(0, 0, W, H); for (let i = 0; i < 90; i++) { const rx = (i * 47.3) % W, ry = (i * 29.7) % H; x.fillStyle = i % 3 ? '#55565b' : '#d99d73'; x.fillRect(rx, ry, i % 3 ? 10 : 4, i % 3 ? 10 : 4); }
    const y = H * .62; x.fillStyle = '#2c2d33'; x.fillRect(0, y - 8, W * .7, 16); x.fillStyle = '#77798a'; x.fillRect(0, y - 8, W * .7, 3); x.fillRect(0, y + 5, W * .7, 3); for (let k = 0; k < 8; k++) { const px = ((t * 40 + k * W * .1) % (W * .7)); x.fillStyle = k % 2 ? '#d99d73' : '#8c7fa9'; x.fillRect(px, y - 3, 6, 6); }
    x.fillStyle = '#5e6170'; x.fillRect(W * .7, H * .42, 54, 54); x.fillStyle = '#ffd37f'; x.fillRect(W * .7 + 4, H * .42 + 4, 8, 8); x.fillRect(W * .7 + 42, H * .42 + 42, 8, 8); x.fillStyle = '#ffb347'; x.beginPath(); x.arc(W * .7 + 27, H * .42 + 27, 11, 0, 6.3); x.fill();
    const a = Math.sin(t * 2) * .6 - .6; x.save(); x.translate(W * .3, H * .3); x.fillStyle = '#5f616d'; x.fillRect(-12, -12, 24, 24); x.rotate(a); x.fillStyle = '#8b8d99'; x.fillRect(-7, -6, 14, 13); x.fillStyle = '#6b6d79'; x.fillRect(3, -4, 14, 3); x.fillRect(3, 2, 14, 3); x.restore();
    x.fillStyle = '#f25555'; const ex = W * .9 - (t * 20 % (W * .5)); x.fillRect(ex, H * .2, 9, 9); },
  zerochip: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#0a3324'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(160,230,190,.25)'; for (let i = 8; i < W; i += 16) for (let j = 8; j < H; j += 16) x.fillRect(i, j, 1.5, 1.5);
    x.lineWidth = 3; x.lineCap = 'round'; const on = k => Math.sin(t * 3 - k * .9) > 0; for (const [k, pts] of [[0, [[20, 40], [90, 40], [90, 56], [128, 56]]], [1, [[20, 104], [90, 104], [90, 84], [128, 84]]], [2, [[192, 70], [250, 70], [250, 40], [300, 40]]], [3, [[250, 70], [250, 104], [300, 104]]]]) { x.strokeStyle = on(k) ? '#ffd35a' : '#3f6f9a'; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }
    x.fillStyle = '#1b222d'; x.beginPath(); x.roundRect(128, 44, 64, 52, 7); x.fill(); x.strokeStyle = '#6f8196'; x.lineWidth = 1.5; x.stroke(); x.fillStyle = '#ffe29a'; x.font = '800 15px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NAND', 160, 71); x.fillStyle = on(2) ? '#ff5a4d' : '#4a1f1c'; x.beginPath(); x.arc(304, 40, 9, 0, 6.283); x.fill(); x.fillStyle = on(3) ? '#ff5a4d' : '#4a1f1c'; x.beginPath(); x.arc(304, 104, 9, 0, 6.283); x.fill(); },
  zerospace: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#07070a'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const sx = (i * 97.3 + t * (6 + i % 4 * 6)) % W, sy = (i * 53.7) % H; x.fillStyle = `rgba(230,224,208,${.25 + (i % 5) * .12})`; x.fillRect(W - sx, sy, i % 7 ? 1 : 2, i % 7 ? 1 : 2); }
    const cx = W * .5 + Math.sin(t * .7) * 30, cy = H * .5 + Math.sin(t * 1.1) * 8; x.save(); x.translate(cx, cy);
    x.fillStyle = '#33496b'; x.fillRect(-34, -8, 52, 16); x.fillStyle = '#17253f'; x.fillRect(-26, -16, 30, 32); x.fillStyle = '#b2382a'; x.fillRect(18, -5, 14, 10); x.fillStyle = '#c9a24a'; x.fillRect(-8, -3, 10, 6);
    x.fillStyle = `rgba(95,176,200,${.6 + .4 * Math.sin(t * 20)})`; x.fillRect(-44 - Math.random() * 8, -5, 10, 10); x.restore();
    x.fillStyle = '#e4614a'; for (let k = 0; k < 3; k++) { const bx = (t * 160 + k * 110) % (W + 40); x.fillRect(cx + 34 + bx, cy - 1, 8, 2); } },
  viztorony: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#251c3e'); gr.addColorStop(1, '#0a1a10'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1c1712'; x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H); x.fillStyle = 'rgba(232,182,86,.4)'; x.fillRect(25, 0, 2, H); x.fillRect(W - 27, 0, 2, H);
    const pl = [[60, 118, 70], [150, 88, 54], [222, 58, 48], [120, 30, 42]]; x.fillStyle = '#6b4a2a'; for (const [px, py, w] of pl) { x.fillRect(px, py, w, 8); } x.fillStyle = '#c8964a'; for (const [px, py, w] of pl) x.fillRect(px, py, w, 3);
    const k = (t * .55) % 1, sx = 95 + 82 * k, sy = 118 - 30 * k - Math.sin(k * Math.PI) * 42; x.fillStyle = '#2f8fe0'; x.fillRect(sx - 5, sy - 13, 10, 8); x.fillStyle = '#f1c9a0'; x.fillRect(sx - 4, sy - 18, 8, 6); x.fillStyle = '#e8b656'; x.fillRect(sx - 5, sy - 20, 10, 3);
    x.fillStyle = '#ffd77a'; x.save(); x.translate(141, 18); x.rotate(t * 3); x.fillRect(-8, -2, 16, 4); x.restore(); },
  locsolo: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a2410'); gr.addColorStop(1, '#140b04'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const px = W * (.14 + i * .24), py = H * .62, w = (Math.sin(t + i) + 1) / 2; x.fillStyle = '#7a4325'; x.fillRect(px - 14, py, 28, 22); x.strokeStyle = `hsl(${30 + 90 * w},60%,40%)`; x.lineWidth = 3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (1 - w) * 10, py - 30); x.stroke();
      x.fillStyle = w > .4 ? '#ffd23f' : '#9a7a3a'; x.beginPath(); x.arc(px + (1 - w) * 10, py - 32, 7, 0, 6.283); x.fill(); }
    for (let i = 0; i < 14; i++) { const k = (t * 1.5 + i / 14) % 1; x.fillStyle = `rgba(150,215,255,${1 - k})`; x.beginPath(); x.arc(W * .5 + Math.sin(i * 7) * W * .3 * k, H * .1 + k * H * .5, 2, 0, 6.283); x.fill(); } },
  anya: (c, x, t) => { const W = c.width, H = c.height, cy = H / 2; x.fillStyle = '#121820'; x.fillRect(0, 0, W, H); x.fillStyle = '#aab4c0'; x.fillRect(0, cy - 9, W, 18); x.strokeStyle = 'rgba(20,26,34,.6)'; x.lineWidth = 1.5; x.beginPath(); for (let i = -20; i < W; i += 9) { x.moveTo(i, cy - 9); x.lineTo(i + 6, cy + 9); } x.stroke();
    const nx = W * (.25 + .5 * ((t * .25) % 1)), a = t * 6; x.fillStyle = '#e8c46a'; x.fillRect(nx - 13, cy - 24, 26, 48); x.strokeStyle = 'rgba(60,40,10,.7)'; x.beginPath(); for (let k = 0; k < 6; k++) { const q = a + k * Math.PI / 3; if (Math.cos(q) <= 0) continue; x.moveTo(nx - 13, cy + Math.sin(q) * 24); x.lineTo(nx + 13, cy + Math.sin(q) * 24); } x.stroke(); x.fillStyle = '#dfe5ec'; x.fillRect(nx - 4, cy - 24 - 34 * Math.abs(Math.sin(a)), 8, 34 * Math.abs(Math.sin(a))); },
  nyomas: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#0b1424'; x.fillRect(0, 0, W, H); const cx = W / 2, cy = H * .85, R = H * .65;
    x.lineWidth = 12; x.strokeStyle = '#1e2b40'; x.beginPath(); x.arc(cx, cy, R, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.strokeStyle = '#5ee08a'; x.beginPath(); x.arc(cx, cy, R, Math.PI * 1.45, Math.PI * 1.55); x.stroke();
    const a = Math.PI * 1.1 + Math.PI * .8 * ((Math.sin(t * 2) + 1) / 2); x.strokeStyle = '#ffd77a'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R * 1.05, cy + Math.sin(a) * R * 1.05); x.stroke(); },
  vizagyu: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a2810'); gr.addColorStop(1, '#1a0d05'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { const ex = W * (.25 + i * .25), ey = ((t * 30 + i * 40) % (H + 20)) - 10; x.fillStyle = i === 1 ? '#ff9a2e' : '#3f8a3a'; x.beginPath(); x.arc(ex, ey, 9, 0, 6.283); x.fill(); }
    const cx = W / 2 + Math.sin(t) * W * .25; x.fillStyle = '#9fdcff'; for (let k = 0; k < 6; k++) { x.fillRect(cx - 2, H - 30 - ((t * 200 + k * 22) % H), 4, 8); }
    x.fillStyle = '#e8b656'; x.fillRect(cx - 5, H - 34, 10, 20); x.fillStyle = '#2d3b52'; x.fillRect(cx - 18, H - 16, 36, 16); },
  ugro: (c, x, t) => { const W = c.width, H = c.height; const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0c3046'); gr.addColorStop(1, '#0a2a1c'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    const s = H / 120, off = (t * 26) % 40; for (let i = -1; i < 5; i++) { const y = (i * 40 + off) * s, px = W * (.25 + .5 * (((i * 7 + Math.floor(t * 26 / 40) * 3) % 5 + 5) % 5) / 4); x.fillStyle = '#2f8f3f'; x.beginPath(); x.roundRect(px - 22 * s, y, 44 * s, 8 * s, 4 * s); x.fill(); x.fillStyle = '#5ee08a'; x.fillRect(px - 18 * s, y + 1.5 * s, 36 * s, 2 * s); }
    const b = Math.abs(Math.sin(t * 3.2)), dx = W / 2 + Math.sin(t * 1.1) * W * .18, dy = H * .78 - b * H * .42, r = 10 * s; x.fillStyle = '#6cc6ff'; x.beginPath(); x.moveTo(dx, dy - r * 1.75); x.quadraticCurveTo(dx + r * 1.05, dy - r * .5, dx + r, dy + .1 * r); x.arc(dx, dy + .1 * r, r, 0, Math.PI); x.quadraticCurveTo(dx - r * 1.05, dy - r * .5, dx, dy - r * 1.75); x.fill(); x.fillStyle = '#04121f'; x.beginPath(); x.arc(dx - 3 * s, dy, 1.6 * s, 0, 6.283); x.arc(dx + 3 * s, dy, 1.6 * s, 0, 6.283); x.fill(); },
  csepp: (c, x, t) => { const W = c.width, H = c.height; x.fillStyle = '#0c2238'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { const px = ((W + 60) - ((t * 50 + i * 90) % (W + 60))) - 30, gap = H * .28 + 40 + Math.sin(i * 3) * 10; const top = H * (.2 + .15 * Math.sin(i * 5));
      x.fillStyle = '#aab6c2'; x.fillRect(px, 0, 22, top); x.fillRect(px, top + gap, 22, H); x.fillStyle = '#b5873a'; x.fillRect(px - 3, top - 8, 28, 8); x.fillRect(px - 3, top + gap, 28, 8); }
    const y = H * .5 + Math.sin(t * 4) * 14; x.fillStyle = '#6cc6ff'; x.beginPath(); x.arc(W * .25, y, 9, 0, 6.283); x.fill(); }
};

function renderCards() {
  const wrap = $('#games');
  if (!wrap.children.length) {
    GAMES.forEach((gm, i) => {
      const el = document.createElement('article'); el.className = 'card reveal'; el.dataset.id = gm.id; el.tabIndex = 0; el.setAttribute('role', 'button');
      el.innerHTML = `<span class="tag">${String(i + 1).padStart(2, '0')}</span><div class="art"><canvas width="320" height="140"></canvas></div><h3>${gm.name}</h3>${gm.sponsor ? `<span class="spon">${gm.sponsor}</span>` : ''}<p>${gm.desc.split('.')[0]}.</p><div class="foot"><span class="best" data-id="${gm.id}"${gm.ext ? ' data-ext="1"' : ''}></span><span class="play">JÁTÉK ▶</span></div>`;
      el.addEventListener('click', () => launch(gm)); el.addEventListener('keydown', e => { if (e.key === 'Enter') launch(gm); });
      if (gm.lock) { el.hidden = true; el.dataset.lock = '1'; } wrap.appendChild(el); io.observe(el);
    });
    const arts = [...wrap.querySelectorAll('canvas')];
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(wrap);
    (function anim(now) { requestAnimationFrame(anim); if (!vis || document.hidden || gEl.classList.contains('open')) return;
      arts.forEach((c, i) => ARTS[GAMES[i].id](c, c.getContext('2d'), now / 1000)); })(0);
    popOrder();
  }
  wrap.querySelectorAll('.best').forEach(b => { if (b.dataset.ext) { const eg = GAMES.find(x => x.id === b.dataset.id); b.textContent = (eg && eg.tag) || 'DEMO'; return; } const v = store.get('best_' + b.dataset.id), gm = GAMES.find(x => x.id === b.dataset.id), w = store.get('wins_' + b.dataset.id); b.textContent = 'REKORD: ' + (gm.sfmt ? gm.sfmt(v) : bigNum(v)) + (gm.lb ? ' ' + gm.lb : '') + (w ? ' · 🏆×' + w : ''); });
}
renderCards();
$('#yr').textContent = new Date().getFullYear();
startHero();
function deep() { const m = location.hash.match(/^#play=(\w+)(?:\.(\w+))?/); const gm = m && GAMES.find(x => x.id === m[1]); if (!gm && window.top !== window && !/[?&]bo=/.test(location.search)) { toList(); return; } if (gm) { gm.room = m[2] || ''; launch(gm); history.replaceState(null, '', location.pathname + location.search); } }
deep(); addEventListener('hashchange', deep);
/* online ranglista: az adatokat a HGWS főoldal küldi (ott van a bejelentkezés) */
let LB = null, lbt = 'all';
function lbDraw() {
  if (!LB) return;
  $('#lbw').hidden = false;
  const esc = t => String(t).replace(/[<>&"]/g, '');
  const base = lbt === 'week' ? `E heti verseny (${LB.week}) – a hét végén a legjobb regisztrált játékosok megkapják az „Arcade-bajnok” taget! 🏆` : 'Minden idők legjobbjai.';
  $('#lbn').innerHTML = LB.guest
    ? `Vendégként <b>${esc(LB.nick)}</b> néven szerepelsz a ranglistán. <button class="lbnick" data-nick>✏️ Becenév módosítása</button>`
    : base;
  $('#lbg').innerHTML = byPop(GAMES).filter(g => !g.ext || g.lbx).map(g => { const l = (LB.boards[g.id] || {})[lbt] || [];
    return `<div class="lbc${g.unit ? ' wide' : ''}"><h4>${g.icon || ''} ${g.name}</h4>${l.length ? l.map((r, i) => `<div class="lbr${r.me ? ' me' : ''}${LB.admin && r.uid ? ' adm' : ''}"><i>${['🥇', '🥈', '🥉'][i] || i + 1}</i><span${r.uid ? ` class="lbu" data-prof="${esc(r.uid)}" data-pn="${r.guest ? esc(r.name) : ''}"` : ''}>${esc(r.name)}${r.guest ? '<em class="lbg2">VENDÉG</em>' : ''}</span><b>${r.wins ? `<em class="lbw2" title="Arany Locsolófej">🏆×${r.wins}</em>` : ''}${g.fmt ? g.fmt(r.score) : bigNum(r.score)}${g.lb ? ' ' + g.lb : ''}</b>${LB.admin && r.uid ? `<button class="lbdel" data-del="${g.id}|${esc(r.uid)}" title="Eredmény törlése">🗑</button>` : ''}</div>`).join('') : '<p class="lbe">Még senki – légy te az első!</p>'}</div>`; }).join('');
}
$('#lbw').addEventListener('click', e => { if (e.target.closest('[data-nick]')) { parent.postMessage({ hgws: 'nickreq' }, location.origin); return; }
  const pr = e.target.closest('[data-prof]'); if (pr) { parent.postMessage({ hgws: 'lbprof', uid: pr.dataset.prof, nick: pr.dataset.pn || '' }, location.origin); return; }
  const del = e.target.closest('[data-del]');
  if (del) { if (!del.classList.contains('sure')) { document.querySelectorAll('.lbdel.sure').forEach(x => { x.classList.remove('sure'); x.textContent = '🗑'; }); del.classList.add('sure'); del.textContent = 'Biztos?'; clearTimeout(del._t); del._t = setTimeout(() => { del.classList.remove('sure'); del.textContent = '🗑'; }, 3000); return; }
    const [game, uid] = del.dataset.del.split('|'); del.disabled = true; del.textContent = '…'; parent.postMessage({ hgws: 'lbdel', game, uid }, location.origin); return; } const b = e.target.closest('[data-lbt]'); if (!b) return; lbt = b.dataset.lbt; document.querySelectorAll('[data-lbt]').forEach(x => x.classList.toggle('on', x === b)); lbDraw(); });
addEventListener('message', e => { if (e.origin !== location.origin || e.data?.hgws !== 'lb') return; LB = e.data;
  if (LB.plays) { PLAYS = LB.plays; try { localStorage.setItem('hgws_plays', JSON.stringify(PLAYS)); } catch (_) {} popOrder(); } lbDraw();
  window.HGZQ_SEEN = true; window.HGZQ_OK = LB.beta === true; document.querySelectorAll('#games [data-lock]').forEach(el => { el.hidden = !window.HGZQ_OK; }); if (zqWait) { zqWait = false; if (window.HGZQ_OK) openExt(ZeroQuest); } });
if (window.top !== window) parent.postMessage({ hgws: 'lbreq' }, location.origin);
// a helyi rekordok felszinkronizálása a ranglistára: betöltéskor (a játékok a kör/játék végén maguk küldik az új eredményt)
if (window.top !== window) { const sent = {}; const syncB = () => { const bests = {}; for (const gm of GAMES) if (!gm.ext) { const v = store.get('best_' + gm.id); if (v > 0 && v !== sent[gm.id]) bests[gm.id] = sent[gm.id] = v; } if (Object.keys(bests).length) parent.postMessage({ hgws: 'sync', bests }, location.origin); };
  syncB();
  // a tábla frissítése mások eredményeivel: kétpercenként, csak ha a ranglista látszik és nincs nyitva játék
  let lbVis = false; new IntersectionObserver(e => { lbVis = e[0].isIntersecting; }).observe($('#lbw')); setInterval(() => { if (lbVis && !document.hidden && !gEl.classList.contains('open') && EXT.hidden) parent.postMessage({ hgws: 'lbreq' }, location.origin); }, 120000); }
/* a HGWS oldalba ágyazva a játékból kilépve az új Arcade-listára megyünk vissza (js/arcade-lista.js) */
if (window.top !== window) { let was = false; const chk = () => { const open = gEl.classList.contains('open') || !EXT.hidden; if (was && !open) parent.postMessage({ hgws: 'nav', to: '#/arcade' }, location.origin); was = open; };
  new MutationObserver(chk).observe(gEl, { attributes: true, attributeFilter: ['class'] }); new MutationObserver(chk).observe(EXT, { attributes: true, attributeFilter: ['hidden'] }); }
