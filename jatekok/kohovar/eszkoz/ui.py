# A Mindustry kezelőfelületének elemei a böngészőnek: a 9-patch keretek (a vezetővonalak levágásával),
# a pixeles betűtípus és az ikonbetűkészlet (a felhasznált karakterekre szűkítve).
# Futtatás: python3 ui.py <mindustry-gyökér> <kimeneti mappa (kepek)>
import sys, os, json
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont

root, out = sys.argv[1], sys.argv[2]
ui = os.path.join(root, 'core/assets-raw/sprites/ui')
os.makedirs(os.path.join(out, 'ui'), exist_ok=True)
NINE = ['button', 'button-over', 'button-down', 'button-disabled', 'button-red', 'button-trans', 'button-right', 'button-right-over', 'button-right-down', 'button-right-disabled',
        'button-edge-1', 'button-edge-2', 'button-edge-3', 'button-edge-4', 'button-edge-over-4', 'button-select', 'pane', 'pane-2', 'pane-solid', 'pane-left', 'pane-right', 'pane-top',
        'window-empty', 'wavepane', 'underline', 'underline-over', 'underline-white', 'underline-2', 'sideline', 'sideline-over', 'flat-down-base', 'bar', 'bar-top', 'inventory', 'slider-back', 'scroll', 'white-pane']
meta = {}
for n in NINE:
    im = Image.open(os.path.join(ui, n + '.9.png')).convert('RGBA'); w, h = im.size; px = im.load()
    xs = [x for x in range(1, w - 1) if px[x, 0][3] > 0]; ys = [y for y in range(1, h - 1) if px[0, y][3] > 0]
    c = im.crop((1, 1, w - 1, h - 1)); c.save(os.path.join(out, 'ui', n + '.png'))
    cw, ch = c.size; l, r = xs[0] - 1, cw - xs[-1]; t, b = ys[0] - 1, ch - ys[-1]
    meta[n] = [t, r, b, l]
for n in ['check-on', 'check-off', 'check-over', 'check-on-over', 'slider-knob', 'slider-knob-over', 'scroll-knob-vertical-black', 'nomap']:
    Image.open(os.path.join(ui, n + '.png')).save(os.path.join(out, 'ui', n + '.png'))
json.dump(meta, open(os.path.join(out, 'ui', 'kilenc.json'), 'w'))

# betűtípus: latin, magyar ékezetek, néhány jel
text = ''.join(chr(c) for c in range(0x20, 0x7f)) + 'ÁÉÍÓÖŐÚÜŰáéíóöőúüű×·–—…→←↑↓°±%€©«»„”’'
fo = subset.Options(); fo.flavor = 'woff'; fo.layout_features = []; fo.name_IDs = ['*']; fo.notdef_outline = True
f = TTFont(os.path.join(root, 'core/assets/fonts/font.woff')); s = subset.Subsetter(fo); s.populate(text=text); s.subset(f); f.flavor = 'woff'; f.save(os.path.join(out, 'betu.woff'))

# ikonok: a kezelőfelület ikonjai (a márkajelzések nélkül)
ICONS = ['play', 'pause', 'menu', 'book', 'book-open', 'tree', 'settings', 'exit', 'left', 'right', 'up', 'down', 'up-open', 'down-open', 'left-open', 'right-open', 'ok', 'cancel', 'add',
         'trash', 'refresh-1', 'save', 'download', 'upload', 'map', 'terrain', 'planet', 'info', 'info-circle', 'warning', 'lock', 'lock-open', 'zoom', 'list', 'grid', 'home', 'star',
         'turret', 'production', 'distribution', 'liquid', 'power_', 'defense', 'crafting', 'units', 'effect', 'logic', 'wrench', 'hammer', 'eye', 'eye-off', 'chart-bar', 'layers', 'box',
         'file', 'folder', 'copy', 'paste', 'rotate', 'flag', 'command-rally', 'command-attack', 'mode-survival', 'mode-attack', 'filter', 'tags', 'tag', 'chat', 'admin', 'players', 'waves', 'pencil_', 'edit', 'pick', 'move', 'resize', 'line', 'fill', 'eraser', 'image', 'link', 'export']
it = TTFont(os.path.join(root, 'core/assets/fonts/icon.ttf')); cm = it.getBestCmap(); byname = {v: k for k, v in cm.items()}
use = {n: byname[n] for n in ICONS if n in byname}
io = subset.Options(); io.flavor = 'woff'; io.layout_features = []; io.notdef_outline = True
s = subset.Subsetter(io); s.populate(unicodes=list(use.values())); s.subset(it); it.flavor = 'woff'; it.save(os.path.join(out, 'ikon.woff'))
json.dump({n.rstrip('_').replace('refresh-1', 'refresh'): cp for n, cp in use.items()}, open(os.path.join(out, 'ui', 'ikonok.json'), 'w'))
print('9-patch', len(meta), 'ikon', len(use), 'betű', os.path.getsize(os.path.join(out, 'betu.woff')), 'ikonfont', os.path.getsize(os.path.join(out, 'ikon.woff')))

# CSS: 9-patch keretek (np-<név>) és ikonok (ic-<név>)
css = ["@font-face{font-family:mfont;src:url(../betu.woff) format('woff')}", "@font-face{font-family:mico;src:url(../ikon.woff) format('woff')}",
       ".ic::before{font-family:mico;font-style:normal;font-weight:normal;display:inline-block;line-height:1;text-shadow:none}"]
for n, (t, r, b, l) in meta.items():
    css.append(f".np-{n}{{border-style:solid;border-width:{t}px {r}px {b}px {l}px;border-image:url({n}.png) {t} {r} {b} {l} fill/{t}px {r}px {b}px {l}px stretch;background:none}}")
for n, cp in json.load(open(os.path.join(out, 'ui', 'ikonok.json'))).items():
    css.append(f".ic-{n}::before{{content:'\\{cp:x}'}}")
open(os.path.join(out, 'ui', 'elemek.css'), 'w').write('\n'.join(css) + '\n')
