#!/usr/bin/env python3
# Futtatás: python3 tools/matricak.py  → img/stickers/hgws/*.svg + stickers.json
# Egy matrica később PNG/WebP-re cserélhető: ugyanazzal az id-vel, a stickers.json „file” mezőjét átírva.
"""HGWS matricák és saját emojik SVG-ben (512×512 matrica, 64×64 kerek emoji)."""
import json, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'img', 'stickers', 'hgws')
os.makedirs(OUT + '/emoji', exist_ok=True)

INK = '#0b1424'
FONT = "font-family=\"'Arial Black','Segoe UI Black','Helvetica Neue',Impact,system-ui,sans-serif\" font-weight=\"900\""

DEFS = f'''<defs>
<linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8f0ff"/><stop offset=".45" stop-color="#6cc6ff"/><stop offset="1" stop-color="#2479c7"/></linearGradient>
<linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1bf"/><stop offset=".4" stop-color="#ffe29a"/><stop offset=".75" stop-color="#e8b656"/><stop offset="1" stop-color="#b27a22"/></linearGradient>
<linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b37a"/><stop offset="1" stop-color="#d27a3e"/></linearGradient>
<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a6a"/><stop offset="1" stop-color="#d9452c"/></linearGradient>
<linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9f27a"/><stop offset="1" stop-color="#3f9d3a"/></linearGradient>
<linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b77a"/><stop offset="1" stop-color="#8a7440"/></linearGradient>
<radialGradient id="gSun"><stop offset="0" stop-color="#fff6c8"/><stop offset=".6" stop-color="#ffd25a"/><stop offset="1" stop-color="#f29a2e"/></radialGradient>
<filter id="cut" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="13" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/><feDropShadow in="w" dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".35" result="ws"/><feMerge><feMergeNode in="ws"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="gGlow"><stop offset="0" stop-color="#ffe29a" stop-opacity=".9"/><stop offset="1" stop-color="#ffe29a" stop-opacity="0"/></radialGradient>
</defs>'''


def svg(body, cut=True, size=512):
    """matrica: a rajzot vastag fehér „kivágás” kontúr veszi körül; a <!--BACK-->…<!--/BACK--> rész (ragyogás) kívül marad"""
    back = ''
    if '<!--BACK-->' in body:
        a, b = body.index('<!--BACK-->'), body.index('<!--/BACK-->')
        back, body = body[a + 11:b], body[:a] + body[b + 12:]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'{DEFS}<g transform="translate({size/2} {size/2}) scale(.88) translate(-{size/2} -{size/2})">'
            f'{back}<g filter="url(#cut)">{body}</g></g></svg>')


def label(text, y=440, size=60, fill='url(#gG)', rot=-4, x=256):
    return (f'<g transform="rotate({rot} {x} {y})"><text x="{x}" y="{y}" text-anchor="middle" {FONT} font-size="{size}" '
            f'fill="{fill}" stroke="{INK}" stroke-width="{size*.2:.1f}" paint-order="stroke" stroke-linejoin="round" letter-spacing="1">{text}</text></g>')


# ---------- vízcsepp kabala ----------
DROP = 'M256 70 C256 70 118 228 118 318 A138 138 0 0 0 394 318 C394 228 256 70 256 70Z'


def drop(face, fill='url(#gW)', extra='', dy=0):
    return (f'<g transform="translate(0 {dy})"><path d="{DROP}" fill="{fill}" stroke="{INK}" stroke-width="13" stroke-linejoin="round"/>'
            f'<path d="M190 250 C200 205 225 170 240 150" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none" opacity=".75"/>'
            f'<circle cx="182" cy="285" r="9" fill="#fff" opacity=".75"/>{face}{extra}</g>')


def eyes_open(y=300, dx=48, r=20):
    return ''.join(f'<ellipse cx="{256+s*dx}" cy="{y}" rx="{r*.8:.0f}" ry="{r}" fill="{INK}"/><circle cx="{256+s*dx+5}" cy="{y-7}" r="{r*.32:.0f}" fill="#fff"/>' for s in (-1, 1))


def cheeks(y=338, c='#ff8fa3', o=.55):
    return f'<ellipse cx="182" cy="{y}" rx="20" ry="11" fill="{c}" opacity="{o}"/><ellipse cx="330" cy="{y}" rx="20" ry="11" fill="{c}" opacity="{o}"/>'


def arc_eyes(y=300, up=True, dx=48):
    d = -16 if up else 16
    return ''.join(f'<path d="M{256+s*dx-20} {y+(8 if up else -6)} Q{256+s*dx} {y+d} {256+s*dx+20} {y+(8 if up else -6)}" stroke="{INK}" stroke-width="10" fill="none" stroke-linecap="round"/>' for s in (-1, 1))


def heart(x, y, s=1, fill='#ff5d7a'):
    return (f'<path transform="translate({x} {y}) scale({s})" d="M0 12 C-30 -14 -22 -38 0 -24 C22 -38 30 -14 0 12Z" fill="{fill}" '
            f'stroke="{INK}" stroke-width="{6/s:.1f}" stroke-linejoin="round"/>')


def sparkle(x, y, s=1, fill='#fff6c8'):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 -24 L6 -6 L24 0 L6 6 L0 24 L-6 6 L-24 0 L-6 -6Z" fill="{fill}" stroke="{INK}" stroke-width="{4/s:.1f}" stroke-linejoin="round"/>'


SMILE = f'<path d="M216 352 Q256 392 296 352" stroke="{INK}" stroke-width="11" fill="none" stroke-linecap="round"/>'
BIGMOUTH = f'<path d="M206 345 Q256 425 306 345Z" fill="#7a1f2e" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/><path d="M226 384 Q256 402 286 384 Q256 370 226 384Z" fill="#ff7a8c"/>'

drop_happy = drop(eyes_open() + cheeks() + SMILE)
drop_sad = drop(
    ''.join(f'<path d="M{256+s*48-22} {282+(-6 if s<0 else -6)} L{256+s*48+22} {282+(6 if s<0 else -6)*(-1 if s>0 else 1)}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>' for s in (-1, 1))
    + eyes_open(306, r=17)
    + f'<path d="M222 372 Q256 344 290 372" stroke="{INK}" stroke-width="11" fill="none" stroke-linecap="round"/>'
    + f'<path d="M196 326 C190 350 186 372 198 384 C210 372 206 350 196 326Z" fill="#bfeaff" stroke="{INK}" stroke-width="6"/>'
    + f'<path d="M318 326 C312 356 306 386 322 404 C338 386 330 356 318 326Z" fill="#bfeaff" stroke="{INK}" stroke-width="6"/>')
drop_heart = drop(heart(208, 304, 1.1) + heart(304, 304, 1.1) + cheeks() + SMILE,
                  extra=heart(410, 150, 1.3) + heart(110, 190, .9) + heart(400, 250, .7))
drop_laugh = drop(
    ''.join(f'<path d="M{256+s*48-20} {286} L{256+s*48+(18 if s<0 else -18)} {300} L{256+s*48-20} {314}" transform="{"" if s<0 else f"translate({2*(256+s*48)} 0) scale(-1 1)"}" stroke="{INK}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' for s in (-1, 1))
    + BIGMOUTH + cheeks(340)
    + f'<path d="M168 300 C150 312 140 332 150 344 C164 344 172 324 168 300Z" fill="#bfeaff" stroke="{INK}" stroke-width="6"/>'
    + f'<path d="M344 300 C362 312 372 332 362 344 C348 344 340 324 344 300Z" fill="#bfeaff" stroke="{INK}" stroke-width="6"/>')
drop_think = drop(
    f'<path d="M188 266 Q208 252 230 262" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/>'
    f'<path d="M282 250 Q306 236 326 252" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/>'
    + eyes_open(300, r=17) + f'<path d="M228 362 L286 352" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>',
    extra=f'<circle cx="372" cy="180" r="12" fill="#fff" stroke="{INK}" stroke-width="6"/><circle cx="398" cy="138" r="18" fill="#fff" stroke="{INK}" stroke-width="7"/>'
    + f'<ellipse cx="428" cy="76" rx="56" ry="46" fill="#fff" stroke="{INK}" stroke-width="9"/>'
    + f'<text x="428" y="100" text-anchor="middle" {FONT} font-size="66" fill="{INK}">?</text>')
drop_sleep = drop(arc_eyes(304, False) + cheeks(340, o=.4)
                  + f'<ellipse cx="256" cy="364" rx="14" ry="10" fill="#7a1f2e" stroke="{INK}" stroke-width="6"/>'
                  + f'<path d="M150 360 C130 380 136 404 156 404" stroke="#bfeaff" stroke-width="10" fill="none" stroke-linecap="round"/>',
                  extra=''.join(f'<text x="{x}" y="{y}" {FONT} font-size="{s}" fill="#ffe29a" stroke="{INK}" stroke-width="{s*.18:.0f}" paint-order="stroke">Z</text>' for x, y, s in ((356, 170, 52), (398, 118, 66), (440, 64, 80))))
drop_plus = drop(eyes_open(284, r=17) + cheeks(318) + f'<path d="M222 330 Q256 360 290 330" stroke="{INK}" stroke-width="10" fill="none" stroke-linecap="round"/>', dy=-30,
                 extra=f'<g transform="rotate(-6 256 400)"><rect x="150" y="352" width="212" height="112" rx="18" fill="url(#gG)" stroke="{INK}" stroke-width="11"/>'
                 f'<text x="256" y="440" text-anchor="middle" {FONT} font-size="82" fill="{INK}">+1</text>'
                 f'<ellipse cx="150" cy="400" rx="26" ry="22" fill="url(#gW)" stroke="{INK}" stroke-width="9"/><ellipse cx="362" cy="400" rx="26" ry="22" fill="url(#gW)" stroke="{INK}" stroke-width="9"/></g>')

# ---------- Szikkadt Szilárd ----------
def szilard(face, skin='url(#gS)', hair=True, extra_back='', extra='', flat=False):
    hair_svg = ''
    if hair:
        if flat:
            hair_svg = f'<path d="M140 190 C160 150 220 132 256 132 C300 132 356 150 374 192 C350 176 330 200 316 176 C300 200 280 176 262 198 C246 176 228 202 210 178 C196 200 172 180 140 190Z" fill="#9c8a4a" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
        else:
            strands = [(150, 214, 112, 150), (164, 200, 140, 118), (180, 190, 168, 96), (200, 184, 196, 112), (214, 182, 222, 84),
                       (236, 178, 246, 104), (256, 178, 268, 76), (276, 178, 300, 108), (296, 182, 318, 90), (316, 186, 352, 124),
                       (334, 194, 384, 150), (350, 206, 392, 196), (190, 188, 150, 140), (300, 180, 340, 150)]
            hair_svg = (f'<path d="M144 216 C150 170 200 150 256 150 C312 150 362 170 368 216 C330 196 300 210 256 200 C212 210 182 196 144 216Z" fill="#b89a52" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
                        + ''.join(f'<path d="M{x1} {y1} Q{(x1+x2)/2+(8 if i%2 else -8):.0f} {(y1+y2)/2:.0f} {x2} {y2}" stroke="{INK}" stroke-width="15" stroke-linecap="round" fill="none"/>' for i, (x1, y1, x2, y2) in enumerate(strands))
                        + ''.join(f'<path d="M{x1} {y1} Q{(x1+x2)/2+(8 if i%2 else -8):.0f} {(y1+y2)/2:.0f} {x2} {y2}" stroke="{"#d9c07a" if i%3 else "#a8894a"}" stroke-width="7" stroke-linecap="round" fill="none"/>' for i, (x1, y1, x2, y2) in enumerate(strands)))
    head = (f'<path d="M150 200 C140 260 146 330 180 380 C206 420 306 420 332 380 C366 330 372 260 362 200 C330 170 182 170 150 200Z" '
            f'fill="{skin}" stroke="{INK}" stroke-width="13" stroke-linejoin="round"/>'
            f'<ellipse cx="146" cy="292" rx="20" ry="30" fill="{skin}" stroke="{INK}" stroke-width="10"/><ellipse cx="366" cy="292" rx="20" ry="30" fill="{skin}" stroke="{INK}" stroke-width="10"/>'
            # repedések a bőrön
            f'<path d="M318 214 l-12 18 l10 10 l-8 16 M190 384 l14 -12 l-4 -14" stroke="#8a4a22" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>'
            # leégett orr és borosta
            f'<ellipse cx="256" cy="312" rx="24" ry="20" fill="#e3563a" stroke="{INK}" stroke-width="8"/><circle cx="248" cy="305" r="5" fill="#fff" opacity=".6"/>'
            + ''.join(f'<circle cx="{x}" cy="{y}" r="3.2" fill="#7a4a2a" opacity=".55"/>' for x, y in ((206, 382), (222, 392), (240, 398), (272, 398), (290, 392), (306, 382), (214, 370), (298, 370))))
    return f'{extra_back}{head}{hair_svg}{face}{extra}'


BROW_ANGRY = f'<path d="M188 238 L240 262 M324 238 L272 262" stroke="{INK}" stroke-width="13" stroke-linecap="round"/>'
EYES_MEAN = ''.join(f'<path d="M{256+s*42-20} {270} Q{256+s*42} {290} {256+s*42+20} {270}Z" fill="#fff" stroke="{INK}" stroke-width="7"/><circle cx="{256+s*42+(4 if s<0 else -4)}" cy="{277}" r="6" fill="{INK}"/>' for s in (-1, 1))
EYES_ROUND = ''.join(f'<circle cx="{256+s*44}" cy="272" r="17" fill="#fff" stroke="{INK}" stroke-width="7"/><circle cx="{256+s*44+(5 if s<0 else -5)}" cy="275" r="7" fill="{INK}"/>' for s in (-1, 1))

szil_laugh = szilard(BROW_ANGRY + EYES_MEAN
                     + f'<path d="M196 342 Q256 420 316 342Z" fill="#5a1420" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
                     + f'<path d="M206 346 L306 346 L300 360 L212 360Z" fill="#fff" stroke="{INK}" stroke-width="4"/>',
                     extra=label('HAHA', 112, 56, '#ffe29a', -12, 410) + label('HA', 160, 44, '#ffe29a', 10, 96))
szil_angry = szilard(BROW_ANGRY + EYES_ROUND
                     + f'<path d="M210 372 Q256 336 302 372" stroke="{INK}" stroke-width="12" fill="none" stroke-linecap="round"/>',
                     skin='url(#gR)',
                     extra=''.join(f'<path d="M{x} {y} q-18 -22 0 -40 q18 -22 0 -44" stroke="#e6edf5" stroke-width="14" fill="none" stroke-linecap="round" opacity=".95"/>' for x, y in ((112, 200), (400, 200)))
                     + f'<path d="M346 236 l14 -14 m-2 18 l18 -4 m-16 -2 l4 -18" stroke="#c0182b" stroke-width="8" stroke-linecap="round"/>')
szil_wet = szilard(
    ''.join(f'<path d="M{256+s*44-15} 258 l30 30 m0 -30 l-30 30" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>' for s in (-1, 1))
    + f'<path d="M214 380 Q256 352 298 380" stroke="{INK}" stroke-width="11" fill="none" stroke-linecap="round"/>',
    flat=True,
    extra_back=f'<ellipse cx="256" cy="452" rx="190" ry="34" fill="url(#gW)" stroke="{INK}" stroke-width="10"/>',
    extra=''.join(f'<path d="M{x} {y} C{x-10} {y+18} {x-10} {y+30} {x} {y+34} C{x+10} {y+30} {x+10} {y+18} {x} {y}Z" fill="#9fe0ff" stroke="{INK}" stroke-width="5"/>' for x, y in ((166, 222), (346, 230), (200, 168), (312, 160), (258, 120), (148, 330), (368, 332)))
    + f'<path d="M60 70 C120 40 200 50 236 110" stroke="#6cc6ff" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M60 70 C120 40 200 50 236 110" stroke="#d6f3ff" stroke-width="8" fill="none" stroke-linecap="round"/>')
szil_shout = szilard(BROW_ANGRY + EYES_MEAN
                     + f'<ellipse cx="256" cy="366" rx="34" ry="26" fill="#5a1420" stroke="{INK}" stroke-width="10"/>',
                     extra_back='<!--BACK-->' + f'<circle cx="256" cy="230" r="215" fill="url(#gSun)" opacity=".55"/>'
                     + ''.join(f'<path d="M256 230 L{256+250*__import__("math").cos(a/8*6.283):.0f} {230+250*__import__("math").sin(a/8*6.283):.0f}" stroke="#ffd25a" stroke-width="18" stroke-linecap="round" opacity=".6"/>' for a in range(8)) + '<!--/BACK-->',
                     extra=label('MEGSZÁRÍTALAK!', 470, 50, 'url(#gR)', -5))
szil_cool = szilard(
    f'<path d="M170 254 L342 254 L334 296 Q300 316 272 290 L262 270 L250 270 L240 290 Q212 316 178 296Z" fill="{INK}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
    + f'<path d="M190 266 L224 266" stroke="#6cc6ff" stroke-width="6" stroke-linecap="round"/><path d="M282 266 L316 266" stroke="#6cc6ff" stroke-width="6" stroke-linecap="round"/>'
    + f'<path d="M226 370 Q270 388 300 360" stroke="{INK}" stroke-width="11" fill="none" stroke-linecap="round"/>',
    extra_back=f'<circle cx="420" cy="96" r="58" fill="url(#gSun)" stroke="{INK}" stroke-width="9"/>',
    extra=f'<g transform="rotate(18 380 396)"><rect x="352" y="356" width="56" height="74" rx="10" fill="#ffd25a" stroke="{INK}" stroke-width="9"/><path d="M362 372 L398 372" stroke="#fff" stroke-width="7" opacity=".7"/><path d="M380 356 L392 312" stroke="#ff5d7a" stroke-width="9" stroke-linecap="round"/></g>')

# ---------- Arany Locsolófej ----------
def nozzle(rot=0, s=1, cx=256, cy=256):
    holes = ''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="#7a5418"/>' for x, y in
                    [(256, 220), (226, 236), (286, 236), (226, 276), (286, 276), (256, 292), (256, 256), (206, 256), (306, 256)])
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s}) translate(-256 -256)">'
            f'<path d="M298 318 L360 400 Q372 418 352 430 L340 438 Q320 446 310 428 L262 340Z" fill="url(#gG)" stroke="{INK}" stroke-width="12" stroke-linejoin="round"/>'
            f'<circle cx="256" cy="256" r="104" fill="url(#gG)" stroke="{INK}" stroke-width="13"/>'
            f'<circle cx="256" cy="256" r="74" fill="#f6cf6e" stroke="#b27a22" stroke-width="6"/>{holes}'
            f'<path d="M184 210 Q200 172 238 162" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" opacity=".85"/></g>')


GLOW = '<!--BACK-->' + f'<circle cx="256" cy="250" r="230" fill="url(#gGlow)"/>' + ''.join(
    f'<path d="M256 250 L{256+235*__import__("math").cos(a/12*6.283):.0f} {250+235*__import__("math").sin(a/12*6.283):.0f}" stroke="#ffe29a" stroke-width="{14 if a%2 else 8}" stroke-linecap="round" opacity=".55"/>' for a in range(12)) + '<!--/BACK-->'
noz_shine = GLOW + nozzle(-20) + sparkle(110, 120, 1.4) + sparkle(400, 110, 1) + sparkle(410, 400, 1.6) + sparkle(96, 380, .9)
HAND = lambda x, y, r: (f'<g transform="translate({x} {y}) rotate({r})"><path d="M-34 30 L-30 150 L30 150 L34 30Z" fill="#2479c7" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
                        f'<rect x="-38" y="18" width="76" height="22" rx="8" fill="#6cc6ff" stroke="{INK}" stroke-width="8"/>'
                        f'<rect x="-30" y="-34" width="60" height="56" rx="20" fill="url(#gS)" stroke="{INK}" stroke-width="10"/>'
                        f'<path d="M-14 -34 L-14 -12 M2 -34 L2 -12 M18 -32 L18 -12" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g>')
noz_got = GLOW + nozzle(-10, .8, 256, 196) + HAND(186, 318, -14) + HAND(326, 318, 14) + sparkle(96, 110, 1.2) + sparkle(420, 90, 1.3) + label('MEGVAN!', 468, 64)
noz_love = nozzle(-20, .92) + heart(100, 130, 1.6) + heart(410, 110, 1.2) + heart(420, 360, 1.5) + heart(120, 390, 1.1) + heart(256, 72, .9)

# ---------- egyéb ----------
POT = f'<path d="M170 360 L342 360 L322 470 L190 470Z" fill="#c0643a" stroke="{INK}" stroke-width="12" stroke-linejoin="round"/><rect x="156" y="336" width="200" height="40" rx="10" fill="#d97a48" stroke="{INK}" stroke-width="12"/>'
plant = (f'<ellipse cx="256" cy="346" rx="96" ry="18" fill="#5b3a22"/>'
         f'<path d="M256 346 C256 290 250 240 256 190" stroke="#3f9d3a" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M256 346 C256 290 250 240 256 190" stroke="{INK}" stroke-width="30" fill="none" stroke-linecap="round" opacity="0"/>'
         f'<path d="M256 220 C210 230 160 200 150 140 C210 130 250 160 256 220Z" fill="url(#gL)" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
         f'<path d="M256 200 C300 200 350 160 360 100 C300 96 260 130 256 200Z" fill="url(#gL)" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
         + POT
         + ''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="{INK}"/>' for x, y in ((236, 412), (276, 412)))
         + f'<path d="M240 432 Q256 446 272 432" stroke="{INK}" stroke-width="6" fill="none" stroke-linecap="round"/>'
         + ''.join(f'<path d="M{x} {y} C{x-8} {y+14} {x-8} {y+24} {x} {y+28} C{x+8} {y+24} {x+8} {y+14} {x} {y}Z" fill="#9fe0ff" stroke="{INK}" stroke-width="5"/>' for x, y in ((180, 70), (330, 40), (400, 170)))
         + label('MEGY EZ!', 110, 52, 'url(#gG)', -6, 200))
cactus = (
         f'<path d="M226 360 C226 300 220 240 236 200 C246 176 266 176 276 200 C290 236 286 300 286 360Z" fill="url(#gC)" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
          f'<path d="M232 280 C200 282 180 270 176 240 C174 222 196 222 198 240 C200 254 214 258 232 256" fill="url(#gC)" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
          f'<path d="M282 270 C320 272 338 300 350 330 C356 344 340 352 332 338 C324 318 312 300 282 296" fill="url(#gC)" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
          + ''.join(f'<path d="M{x-8} {y-8} l16 16 m0 -16 l-16 16" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>' for x, y in ((240, 236), (272, 236)))
          + f'<path d="M238 276 Q256 262 274 276" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/>'
          + f'<path d="M246 186 Q236 150 250 140 Q258 160 252 186Z" fill="#a08a5a" stroke="{INK}" stroke-width="6"/>'
          + POT
          + f'<path d="M196 420 L318 420" stroke="{INK}" stroke-width="0"/>'
          + f'<g transform="rotate(-8 256 120)"><path d="M168 150 L168 92 Q168 40 256 40 Q344 40 344 92 L344 150Z" fill="#a9b3c2" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
          f'<text x="256" y="126" text-anchor="middle" {FONT} font-size="64" fill="{INK}">RIP</text></g>'
          + f'<path d="M80 470 Q120 440 150 466 M362 466 Q400 440 440 470" stroke="#8a7440" stroke-width="8" fill="none" stroke-linecap="round"/>')

import math
def rosette(r1=170, r2=146, n=24):
    pts = []
    for i in range(n * 2):
        a = i / (n * 2) * 2 * math.pi
        r = r1 if i % 2 == 0 else r2
        pts.append(f'{256+r*math.cos(a):.1f} {230+r*math.sin(a):.1f}')
    return 'M' + ' L'.join(pts) + 'Z'


approved = (f'<path d="M190 330 L140 480 L190 452 L214 498 L250 350Z" fill="#2479c7" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
            f'<path d="M322 330 L372 480 L322 452 L298 498 L262 350Z" fill="#2479c7" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
            f'<path d="{rosette()}" fill="url(#gG)" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
            f'<circle cx="256" cy="230" r="118" fill="none" stroke="#b27a22" stroke-width="6" stroke-dasharray="4 10" stroke-linecap="round"/>'
            f'<path d="M256 140 C256 140 226 176 226 196 A30 30 0 0 0 286 196 C286 176 256 140 256 140Z" fill="url(#gW)" stroke="{INK}" stroke-width="7"/>'
            f'<text x="256" y="268" text-anchor="middle" {FONT} font-size="60" fill="{INK}">HGWS</text>'
            f'<text x="256" y="314" text-anchor="middle" {FONT} font-size="34" fill="#7a5418" letter-spacing="2">APPROVED</text>')

ribbon = (f'<path d="M40 200 L110 200 L90 250 L110 300 L40 300 L60 250Z" fill="#b27a22" stroke="{INK}" stroke-width="11" stroke-linejoin="round" transform="translate(0 0)"/>'
          f'<path d="M472 200 L402 200 L422 250 L402 300 L472 300 L452 250Z" fill="#b27a22" stroke="{INK}" stroke-width="11" stroke-linejoin="round"/>'
          f'<path d="M80 160 Q256 120 432 160 L432 290 Q256 250 80 290Z" fill="url(#gG)" stroke="{INK}" stroke-width="12" stroke-linejoin="round"/>'
          f'<text x="256" y="205" text-anchor="middle" {FONT} font-size="44" fill="{INK}">VÍZ. ERŐ.</text>'
          f'<text x="256" y="258" text-anchor="middle" {FONT} font-size="36" fill="{INK}">TECHNIKA.</text>'
          f'<text x="256" y="356" text-anchor="middle" {FONT} font-size="52" fill="#6cc6ff" stroke="{INK}" stroke-width="11" paint-order="stroke">ÉLETFORMA.</text>'
          f'<path d="M256 380 C256 380 232 410 232 426 A24 24 0 0 0 280 426 C280 410 256 380 256 380Z" fill="url(#gW)" stroke="{INK}" stroke-width="7"/>')

hose = (f'<path d="M110 400 C40 380 40 300 110 290 C190 280 200 360 140 370 C90 376 96 320 130 320" stroke="{INK}" stroke-width="44" fill="none" stroke-linecap="round"/>'
        f'<path d="M110 400 C40 380 40 300 110 290 C190 280 200 360 140 370 C90 376 96 320 130 320" stroke="#3f9d3a" stroke-width="28" fill="none" stroke-linecap="round"/>'
        f'<path d="M110 400 C180 420 220 380 250 340" stroke="{INK}" stroke-width="44" fill="none" stroke-linecap="round"/><path d="M110 400 C180 420 220 380 250 340" stroke="#3f9d3a" stroke-width="28" fill="none" stroke-linecap="round"/>'
        f'<g transform="rotate(-40 262 322)"><rect x="240" y="270" width="48" height="96" rx="12" fill="url(#gG)" stroke="{INK}" stroke-width="11"/><rect x="234" y="256" width="60" height="26" rx="8" fill="url(#gG)" stroke="{INK}" stroke-width="10"/></g>'
        f'<path d="M296 284 C350 200 410 170 470 190" stroke="#6cc6ff" stroke-width="40" fill="none" stroke-linecap="round" opacity=".9"/>'
        f'<path d="M296 284 C350 200 410 170 470 190" stroke="#d6f3ff" stroke-width="14" fill="none" stroke-linecap="round"/>'
        + ''.join(f'<path d="M{x} {y} C{x-9} {y+15} {x-9} {y+26} {x} {y+30} C{x+9} {y+26} {x+9} {y+15} {x} {y}Z" fill="#9fe0ff" stroke="{INK}" stroke-width="5"/>' for x, y in ((420, 230), (456, 250), (390, 260), (470, 120), (430, 100)))
        + label('LOCSOLJ!', 120, 62, 'url(#gW)', -6, 210))

gg = (''.join(f'<path d="M{x} {y} C{x-14} {y+24} {x-14} {y+40} {x} {y+46} C{x+14} {y+40} {x+14} {y+24} {x} {y}Z" fill="url(#gW)" stroke="{INK}" stroke-width="6"/>' for x, y in ((80, 80), (430, 70), (70, 380), (446, 390), (256, 40)))
      + f'<text x="256" y="350" text-anchor="middle" {FONT} font-size="230" fill="url(#gW)" stroke="{INK}" stroke-width="24" paint-order="stroke" stroke-linejoin="round" letter-spacing="-6">GG</text>'
      + f'<path d="M110 200 Q140 180 170 186" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" opacity=".8"/><path d="M290 200 Q320 180 350 186" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" opacity=".8"/>'
      + ''.join(f'<circle cx="{x}" cy="{y}" r="10" fill="#9fe0ff" stroke="{INK}" stroke-width="5"/>' for x, y in ((150, 420), (220, 440), (300, 436), (370, 418))))

hgws_drop = (f'<path d="{DROP}" fill="url(#gG)" stroke="{INK}" stroke-width="13" stroke-linejoin="round"/>'
             f'<path d="M190 250 C200 205 225 170 240 150" stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none" opacity=".75"/>'
             f'<text x="256" y="356" text-anchor="middle" {FONT} font-size="76" fill="{INK}">HGWS</text>')

STICKERS = [
    # id, név, alt, kategória, kulcsszavak, test
    ('szilard_nevet', 'Szilárd nevet', 'Szikkadt Szilárd gonoszul nevet', 'szilard', ['gonosz', 'nevet', 'haha', 'szilárd'], szil_laugh),
    ('szilard_duhos', 'Dühös Szilárd', 'Szikkadt Szilárd dühöng, fülén gőz', 'szilard', ['mérges', 'dühös', 'harag'], szil_angry),
    ('szilard_azott', 'Eláztatott Szilárd', 'Szikkadt Szilárd legyőzve, bőrig ázva', 'szilard', ['legyőzve', 'ázott', 'víz', 'nyertünk'], szil_wet),
    ('szilard_megszaritalak', 'Megszárítalak!', 'Szikkadt Szilárd kiabál: Megszárítalak!', 'szilard', ['fenyeget', 'nap', 'száraz'], szil_shout),
    ('szilard_laza', 'Laza Szilárd', 'Szikkadt Szilárd napszemüvegben lazul egy itallal', 'szilard', ['laza', 'napszemüveg', 'chill', 'nyár'], szil_cool),
    ('locsolofej_ragyog', 'Ragyogó Arany Locsolófej', 'Az Arany Locsolófej ragyog', 'locsolofej', ['arany', 'kincs', 'ragyog', 'legenda'], noz_shine),
    ('locsolofej_megvan', 'Megvan!', 'Két kéz magasba emeli az Arany Locsolófejet: Megvan!', 'locsolofej', ['megvan', 'siker', 'győzelem'], noz_got),
    ('locsolofej_sziv', 'Arany Locsolófej szívekkel', 'Az Arany Locsolófej szívecskékkel', 'locsolofej', ['szív', 'szeretet', 'love'], noz_love),
    ('csepp_boldog', 'Boldog csepp', 'Mosolygó vízcsepp', 'csepp', ['boldog', 'mosoly', 'öröm', 'szia'], drop_happy),
    ('csepp_sir', 'Síró csepp', 'Szomorú, könnyező vízcsepp', 'csepp', ['szomorú', 'sír', 'könny'], drop_sad),
    ('csepp_szivszem', 'Szívszemű csepp', 'Szívszemű, szerelmes vízcsepp', 'csepp', ['szív', 'szerelem', 'imád'], drop_heart),
    ('csepp_nevet', 'Nevető csepp', 'Könnyesre nevető vízcsepp', 'csepp', ['nevet', 'vicces', 'lol'], drop_laugh),
    ('csepp_gondolkodik', 'Gondolkodó csepp', 'Gondolkodó vízcsepp kérdőjellel', 'csepp', ['gondolkodik', 'hmm', 'kérdés'], drop_think),
    ('csepp_alszik', 'Alvó csepp', 'Alvó vízcsepp', 'csepp', ['alszik', 'fáradt', 'jó éjt', 'zzz'], drop_sleep),
    ('csepp_plusz1', '+1', 'Vízcsepp +1 táblával', 'csepp', ['egyetért', 'plusz', 'igen', '+1'], drop_plus),
    ('novenyke', 'Megy ez!', 'Kihajtó növényke: Megy ez!', 'egyeb', ['növény', 'nő', 'siker', 'megy ez'], plant),
    ('kaktusz_rip', 'RIP kaktusz', 'Kiszáradt kaktusz RIP sírkővel', 'egyeb', ['rip', 'halott', 'kiszáradt', 'kaktusz'], cactus),
    ('hgws_approved', 'HGWS Approved', 'Arany HGWS Approved pecsét', 'egyeb', ['jóváhagyva', 'approved', 'pecsét', 'oké'], approved),
    ('szlogen', 'Víz. Erő. Technika. Életforma.', 'Szalag a HGWS szlogennel: Víz. Erő. Technika. Életforma.', 'egyeb', ['szlogen', 'hgws', 'víz', 'erő'], ribbon),
    ('locsolj', 'Locsolj!', 'Locsolócső vízsugárral: Locsolj!', 'egyeb', ['locsol', 'cső', 'víz', 'gyerünk'], hose),
    ('gg', 'GG', 'GG felirat vízcseppekből', 'egyeb', ['gg', 'jó játék', 'gratula'], gg),
]

# ---------- kerek emojik (64×64) ----------
def emoji_svg(body, scale=1.0, dy=0, ring='#e8b656', bg='#0d1a2e'):
    body = body.replace('<!--BACK-->', '').replace('<!--/BACK-->', '')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64">{DEFS}'
            f'<circle cx="256" cy="256" r="244" fill="{bg}" stroke="{ring}" stroke-width="20"/>'
            f'<clipPath id="k"><circle cx="256" cy="256" r="234"/></clipPath>'
            f'<g clip-path="url(#k)"><g transform="translate(256 {256+dy}) scale({scale}) translate(-256 -256)">{body}</g></g></svg>')


szil_face = lambda face, skin='url(#gS)', flat=False: szilard(face, skin, flat=flat)
EMOJIS = [
    ('szilard', 'Szikkadt Szilárd', 'Szikkadt Szilárd gonosz vigyora', ['szilárd', 'gonosz'], emoji_svg(szil_face(BROW_ANGRY + EYES_MEAN + f'<path d="M206 352 Q256 400 306 352" stroke="{INK}" stroke-width="12" fill="none" stroke-linecap="round"/>'), 1.05, 10)),
    ('szilard_duhos', 'Dühös Szilárd', 'Dühös Szikkadt Szilárd', ['dühös', 'mérges'], emoji_svg(szil_face(BROW_ANGRY + EYES_ROUND + f'<path d="M210 372 Q256 336 302 372" stroke="{INK}" stroke-width="12" fill="none" stroke-linecap="round"/>', 'url(#gR)'), 1.05, 10)),
    ('szilard_azott', 'Eláztatott Szilárd', 'Bőrig ázott Szikkadt Szilárd', ['ázott', 'legyőzve'], emoji_svg(szil_face(''.join(f'<path d="M{256+s*44-15} 258 l30 30 m0 -30 l-30 30" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>' for s in (-1, 1)) + f'<path d="M214 380 Q256 352 298 380" stroke="{INK}" stroke-width="11" fill="none" stroke-linecap="round"/>', flat=True) + ''.join(f'<path d="M{x} {y} C{x-10} {y+18} {x-10} {y+30} {x} {y+34} C{x+10} {y+30} {x+10} {y+18} {x} {y}Z" fill="#9fe0ff" stroke="{INK}" stroke-width="5"/>' for x, y in ((166, 222), (346, 230))), 1.05, 10)),
    ('locsolofej', 'Arany Locsolófej', 'Ragyogó Arany Locsolófej', ['arany', 'kincs'], emoji_svg(GLOW + nozzle(-20, 1.15), 1, 0)),
    ('csepp', 'Csepp', 'Mosolygó vízcsepp', ['csepp', 'mosoly', 'boldog'], emoji_svg(drop_happy, 1.12, -20)),
    ('csepp_sir', 'Síró csepp', 'Síró vízcsepp', ['sír', 'szomorú'], emoji_svg(drop_sad, 1.12, -20)),
    ('csepp_szivszem', 'Szívszemű csepp', 'Szívszemű vízcsepp', ['szív', 'imád'], emoji_svg(drop(heart(208, 304, 1.1) + heart(304, 304, 1.1) + cheeks() + SMILE), 1.12, -20)),
    ('csepp_nevet', 'Nevető csepp', 'Könnyesre nevető vízcsepp', ['nevet', 'lol'], emoji_svg(drop_laugh, 1.12, -20)),
    ('hgws', 'HGWS', 'Arany HGWS vízcsepp', ['hgws', 'logó'], emoji_svg(hgws_drop, 1.12, -20)),
    ('approved', 'HGWS Approved', 'HGWS Approved pecsét', ['approved', 'jóváhagyva', 'oké'], emoji_svg(approved, 1.08, 0)),
    ('kaktusz', 'Kiszáradt kaktusz', 'Kiszáradt kaktusz', ['kaktusz', 'rip', 'száraz'], emoji_svg(cactus.split('<g transform="rotate(-8 256 120)">')[0], 1.25, -60)),
    ('novenyke', 'Növényke', 'Kihajtó növényke', ['növény', 'nő'], emoji_svg(plant.split('<g transform="rotate(-6')[0], 1.15, -40)),
]

data = {'version': 1, 'base': 'img/stickers/hgws/', 'stickers': [], 'emojis': []}
for sid, name, alt, cat, kw, body in STICKERS:
    fn = f'{sid}.svg'
    open(f'{OUT}/{fn}', 'w').write(svg(body))
    data['stickers'].append({'id': sid, 'name': name, 'alt': alt, 'category': cat, 'keywords': kw, 'file': fn})
for code, name, alt, kw, s in EMOJIS:
    fn = f'emoji/{code}.svg'
    open(f'{OUT}/{fn}', 'w').write(s)
    data['emojis'].append({'code': code, 'name': name, 'alt': alt, 'keywords': kw, 'file': fn})
data['categories'] = {'szilard': 'Szikkadt Szilárd', 'locsolofej': 'Arany Locsolófej', 'csepp': 'Vízcsepp', 'egyeb': 'Egyéb'}
open(f'{OUT}/stickers.json', 'w').write(json.dumps(data, ensure_ascii=False, indent=1))
print(len(STICKERS), 'matrica,', len(EMOJIS), 'emoji')
