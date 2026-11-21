# Az Átemelőtelep – automatikus végigjátszás (Playwright): mind a 6 fejezet a helyes megoldással, a befejező képernyőig.
# A célzás valódi: a játékos egy reális nézőpontból ránéz a tárgyra, a játék pick()-je választja ki, és az E billentyű / a panelgombok működtetik.
#   python3 jatekok/atemelotelep/tesztek/vegigjatszas.py [URL] [--telefon] [--kepek KÖNYVTÁR]
import sys, time, os
from playwright.sync_api import sync_playwright
URL = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8765/jatekok/atemelotelep/index.html')
PHONE = '--telefon' in sys.argv; SHOTS = sys.argv[sys.argv.index('--kepek') + 1] if '--kepek' in sys.argv else None
ARGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
AIM = """async (id) => { const a = window.__at(), o = a.L.it.find(q => q.id === id); if (!o) return 'nincs ilyen: ' + id; const W = a.PAL.WELL, inW = a.S.well.in;
  const c = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2, (o.a[2] + o.b[2]) / 2], frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (const r of [1.3, 1.0, 1.7, .8, 2.0]) for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2, x = c[0] + Math.cos(an) * r, z = c[2] + Math.sin(an) * r; let y;
    if (inW) { if (!(a.PAL.inWellXZ(x, z) && z > W.z0 + .3 && z < W.platZ - .1)) continue; y = W.plat; } else if (a.PAL.inWellXZ(x, z)) { if (x > 5.4 && x < 6.6 && z > -11.2 && z < -10) continue; y = .251; } else y = 0;
    if (a.PAL.overlap(a.L, x, y, z)) continue; const ey = y + a.PAL.EYE, dx = c[0] - x, dy = c[1] - ey, dz = c[2] - z, h = Math.hypot(dx, dz);
    a.P.x = x; a.P.y = y; a.P.z = z; a.P.vx = a.P.vz = a.P.vy = 0; a.P.yaw = Math.atan2(-dx, -dz); a.P.pitch = Math.atan2(dy, h); await frame(); if (window.__at().target && window.__at().target.id === id) return 'ok'; }
  return 'nem célozható: ' + id; }"""
log, fails = [], []
def ok(name, cond, extra=''): print(('✅' if cond else '❌'), name, extra, flush=True); (fails.append(name) if not cond else None)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    c = b.new_context(viewport={'width': 390, 'height': 844} if PHONE else ({'width': 1920, 'height': 1080} if SHOTS else {'width': 1280, 'height': 720}), device_scale_factor=2 if PHONE else 1, has_touch=PHONE, is_mobile=PHONE)
    c.add_init_script("localStorage.clear(); localStorage.setItem('hgws_atemelo_set', JSON.stringify({q:0, scary:0, res:4}))")
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e))); pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.goto(URL); pg.wait_for_function('window.__at', timeout=60000)
    S = lambda js: pg.evaluate(f"(() => {{ const s = window.__at().S; return {js}; }})()")
    def shot(n):   # a képekhez rövid időre magas minőség, teljes felbontás, megállított idő
        if not SHOTS: return
        pg.evaluate("(() => { const a = window.__at(); window.__ts0 = window.__ts; window.__ts = .0001; a.V.setQuality(2); a.V.setRes(false, 1); })()"); pg.wait_for_timeout(9000 if not PHONE else 6000)
        pg.screenshot(path=os.path.join(SHOTS, ('t_' if PHONE else 'd_') + n + '.png'))
        pg.evaluate("(() => { const a = window.__at(); a.V.setQuality(0); a.V.setRes(false, .5); window.__ts = window.__ts0; })()")
    def press(down):   # telefonon a HASZNÁL gombot nyomjuk, asztalin az E billentyűt
        nonlocal_ub = pg.locator('#tc [data-b="use"]').bounding_box() if PHONE else None
        if PHONE:
            pg.mouse.move(nonlocal_ub['x'] + nonlocal_ub['width'] / 2, nonlocal_ub['y'] + nonlocal_ub['height'] / 2); (pg.mouse.down() if down else pg.mouse.up())
        else: (pg.keyboard.down('e') if down else pg.keyboard.up('e'))
    def aim(i):
        r = pg.evaluate(AIM, i); ok('célzás: ' + i, r == 'ok', r); return r == 'ok'
    def use(i, until=None):
        if not aim(i): return
        if until:   # nyomva tartott művelet: addig tartjuk, amíg el nem készül
            press(True); t0 = time.time()
            while time.time() - t0 < 40 and not S(until): pg.wait_for_timeout(150)
            press(False)
        else: press(True); pg.wait_for_timeout(60); press(False)
        pg.wait_for_timeout(250)
    def click(sel, n=1):
        for _ in range(n): pg.click('#pn ' + sel); pg.wait_for_timeout(120)
    def close(): pg.click('#pn [data-a="close"]') if pg.locator('#pn [data-a="close"]').count() else None; pg.wait_for_timeout(200)
    def wait_for(js, t=60, what=''):
        t0 = time.time()
        while time.time() - t0 < t:
            if S(js): return True
            pg.wait_for_timeout(250)
        ok('várakozás: ' + (what or js), False); return False
    pg.click('#mNew'); pg.wait_for_timeout(5800); pg.evaluate("window.__ts = 4")
    ok('1. fejezet indul', S('s.ch') == 1); shot('1_kezdes')
    # ---- 1. A tápellátás ----
    use('lanc'); ok('dokumentum: lánc', pg.locator('#pn .doc').count() == 1); close()
    use('busz'); click('[data-a="takeall"]'); close(); ok('szerszámok a kisbuszból', S('s.inv.multi && s.inv.csavar && s.inv.fogo && s.inv.lakat && s.inv.laptop && s.inv.tkulcs'))
    use('ajto'); ok('konténerajtó nyílik', S('s.door') == 1)
    use('fiok'); click('[data-a="takeall"]'); close(); ok('tartalékok a fiókból', S('s.inv.biztositek == 2 && s.inv.ncsatl == 1'))
    use('naplo'); close(); use('rajz'); close()
    use('szekreny'); shot('1_szekreny')
    click('[data-a="fuse:1"]'); ok('F2 betét csere (Q0 lekapcsolva)', S('s.cab.fuse[1]') == 1)
    click('[data-tab="mm"]'); click('[data-a="mm:Ω"]'); click('[data-a="mp:24"]'); pg.wait_for_timeout(400); ok('zárlat kimérve a 24 V-os körben', S('s.cab.seenShort') == 1)
    click('[data-tab="tap"]'); click('[data-a="jumper"]'); click('[data-a="q0"]'); [click(f'[data-a="q:{i}"]') for i in range(5)]
    pg.wait_for_timeout(600); close(); wait_for('s.ch === 2', 10, '2. fejezet'); ok('2. fejezet: a PLC elindult', S('s.ch') == 2)
    # ---- 2. Jelvezetékek ----
    use('terminal'); click('[data-tab="al"]'); close(); ok('hibalista megnézve', S('s.f.sawAlarms') == 1)
    use('szekreny'); click('[data-tab="x1"]')
    for w, t in [('W106', 6), ('W104', 4), ('W102', 2), ('WX', 7), ('W105', 5)]: click(f'[data-a="wsel:{w}"]'); click(f'[data-a="term:{t}"]')
    pg.wait_for_timeout(500); close(); wait_for('s.ch === 3', 10, '3. fejezet'); ok('3. fejezet: a bekötés helyes', S('s.ch') == 3); shot('2_bekotes')
    # ---- 3. Az akna ----
    if S('s.door') == 0: use('ajto')
    use('szekreny'); click('[data-tab="mot"]'); click('[data-a="mode:0:0"]'); click('[data-a="lock:0"]'); close(); ok('P1 kizárva (LOTO)', S('s.lock[0]') == 1)
    use('vent'); ok('szellőztetés be', S('s.well.vent') == 1)
    use('fedel'); close(); ok('búvónyílás nyitva', S('s.well.hatch') == 1); shot('3_fedel')
    use('fedel_le'); ok('a nyitott fedél visszacsukható', S('s.well.hatch') == 0); use('fedel'); close()
    use('letra_le'); pg.wait_for_timeout(1400); ok('lent az aknában', S('s.well.in') == 1); shot('3_akna')
    use('uszo'); ok('úszó kiszabadítva', S('s.well.float') == 1)
    use('emelo_p1', 's.well.p1up >= 1'); ok('P1 kiemelve', S('s.well.p1up') == 1)
    use('emelo_p1', 's.well.p1clean'); ok('P1 megtisztítva', S('s.well.p1clean') == 1); shot('3_p1')
    use('emelo_p1', 's.well.p1up === 0'); ok('P1 visszaengedve', S('s.well.p1up') == 0)
    ok('gáz a határérték alatt', S('s.well.h2s') < 10, str(S('[s.well.h2s, s.well.vent, s.cab.q[0], s.mains, s.ats, s.stats.gas]')))
    use('letra_fel'); pg.wait_for_timeout(1400); ok('fent', S('s.well.in') == 0)
    if S('s.door') == 0: use('ajto')
    use('szekreny'); click('[data-tab="mot"]'); click('[data-a="unlock:0"]'); click('[data-a="mode:0:A"]'); click('[data-tab="tap"]')
    if S('!s.cab.q[0]'): click('[data-a="q:0"]')
    close(); wait_for('s.ch === 4', 10, '4. fejezet'); ok('4. fejezet', S('s.ch') == 4)
    # ---- 4. A program ----
    use('terminal'); click('[data-tab="prog"]')
    for k, v in [('start1', '2.0'), ('start2', '2.6'), ('stop', '1.0'), ('dry', '0.6'), ('alarm', '3.0')]: pg.fill(f'#pn [data-p="{k}"]', v); pg.dispatch_event(f'#pn [data-p="{k}"]', 'change')
    for i in range(4): pg.select_option(f'#pn [data-c="{i}"]', '0')
    click('[data-a="ptest"]'); pg.wait_for_timeout(300); ok('próbafuttatás: minden ellenőrzés zöld', pg.locator('#pn .chk .bad').count() == 0 and pg.locator('#pn .chk .ok').count() == 5); shot('4_program')
    click('[data-a="pload"]'); close(); ok('program letöltve', S('s.progOK') == 1)
    use('szekreny'); click('[data-tab="mot"]'); click('[data-a="mode:0:A"]'); click('[data-a="mode:1:A"]'); close()
    wait_for('s.ch === 5', 90, '5. fejezet (a szint 2,2 m alá megy)'); ok('5. fejezet', S('s.ch') == 5)
    # ---- 5. Szilárd ----
    wait_for('!s.mains', 30, 'áramszünet'); ok('áramszünet', S('s.mains') == 0)
    use('kanna'); ok('kanna', S('s.inv.kanna') == 1)
    use('tank', 's.gen.fuel > .5'); ok('tankolás', S('s.gen.fuel') > .5)
    use('generator'); click('[data-a="gbat"]'); click('[data-a="gestop"]'); shot('5_aggregat')
    for k, cond in [('pre', 's.gen.pre >= 1'), ('crank', 's.gen.run')]:
        bb = pg.locator(f'#pn [data-hold="{k}"]').bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); t0 = time.time()
        while time.time() - t0 < 30 and not S(cond): pg.wait_for_timeout(150)
        pg.mouse.up(); pg.wait_for_timeout(300)
    ok('aggregát jár', S('s.gen.run') == 1); close()
    wait_for('s.gen.warm >= 1', 10, 'aggregát bemelegszik')
    use('ats'); click('[data-a="ats:1"]', 2); close(); ok('átkapcsolva generátorra', S('s.ats') == 'gen')
    if S('s.door') == 0: use('ajto')
    use('modem'); click('[data-a="modem_pwr"]'); close(); use('antenna'); click('[data-a="ant_fix"]'); close()
    wait_for('s.modem.online', 20, 'VPN online'); pg.wait_for_timeout(900); ok('SMS a diszpécsertől', pg.locator('#pn .doc').count() == 1); close()
    use('keletikapu'); ok('keleti kapu nyitva', S('s.eastGate') == 1)
    use('tolozar', 's.valve >= 1'); wait_for('s.ch === 6', 10, '6. fejezet'); ok('6. fejezet: hajnal', S('s.ch') == 6); pg.wait_for_timeout(5000); shot('6_hajnal')
    # ---- 6. Hajnal ----
    use('kartya'); ok('névjegy', pg.locator('#pn .doc').count() == 1); close(); pg.wait_for_timeout(600)
    ok('befejező képernyő', pg.locator('#end').is_visible()); shot('7_vege')
    ok('statisztika a befejező képernyőn', pg.locator('#end .stats div').count() == 3)
    ok('mentés: a végén nincs folytatható állás', pg.evaluate("!JSON.parse(localStorage.getItem('hgws_atemelo_v1')).cp"))
    b.close()
real = [e for e in errs if 'GPU stall' not in e and 'fonts.googleapis' not in e and 'ERR_TUNNEL' not in e]
ok('konzol: nincs hiba és figyelmeztetés', not real, '\n'.join(real[:8]))
print('\nSIKERTELEN:', fails if fails else 'nincs'); sys.exit(1 if fails else 0)
