# A Mindustry blokkonkénti építési idejének adatai (Block.buildCostMultiplier, buildTime) a Blocks.java-ból.
# Futtatás: python3 epitesido.py <mindustry-gyökér> <kimeneti js>
import sys, re, json
root, out = sys.argv[1], sys.argv[2]
src = open(f'{root}/core/src/mindustry/content/Blocks.java', encoding='utf8').read()
WALLISH = {'Wall', 'Door', 'AutoDoor', 'Thruster', 'ShieldWall'}   # a Wall osztály alapértéke 6
num = lambda s: float(eval(s.replace('f', '').replace('F', '')))
res = {}
for m in re.finditer(r'\w+\s*=\s*new\s+(\w+)\("([a-z0-9-]+)"\)\s*\{\{', src):
    cls, name, i, d = m.group(1), m.group(2), m.end(), 2
    j = i
    while d and j < len(src):          # a {{ … }} törzs vége
        if src[j] == '{': d += 1
        elif src[j] == '}': d -= 1
        j += 1
    body, top, d = src[i:j], [], 0
    for ch in body:                    # csak a legfelső szint (beágyazott lövedék- és rajzolótörzsek nélkül)
        if ch == '{': d += 1
        elif ch == '}': d -= 1
        elif d == 0: top.append(ch)
    top = ''.join(top)
    mul = 6.0 if cls in WALLISH else 1.0
    a = re.search(r'\bbuildCostMultiplier\s*=\s*([0-9.]+f?(?:\s*[*/]\s*[0-9.]+f?)*)', top)
    if a: mul = num(a.group(1))
    t = re.search(r'\bbuildTime\s*=\s*([0-9.]+f?(?:\s*[*/]\s*[0-9.]+f?)*)', top)
    if mul != 1 or t: res[name] = [round(mul, 3), round(num(t.group(1)), 2) if t else None]
open(out, 'w').write('// Generált fájl (eszkoz/epitesido.py): Mindustry-blokknév → [buildCostMultiplier, buildTime vagy null]\nexport const BCM = ' + json.dumps(res, separators=(',', ':')) + ';\n')
print(len(res))
