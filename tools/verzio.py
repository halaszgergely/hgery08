#!/usr/bin/env python3
"""Verziószám a CSS/JS hivatkozások mögé, hogy a böngésző (és a Cloudflare) ne a régi fájlt adja.
Futtatás minden módosítás után:  python3 tools/verzio.py"""
import re, time, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v = time.strftime('%Y%m%d%H%M')
files = list(root.glob('*.html')) + list((root / 'js').glob('*.js')) + list((root / 'jatekok').rglob('*.js')) + list((root / 'jatekok').rglob('*.html'))
pat = re.compile(r'''((?:href|src)=["']|from\s+["']|import\(\s*["'])((?:\.{1,2}/|)(?:css|js|\.)?[\w./-]*?\.(?:css|js|json))(?:\?v=\d+)?(["'])''')
for f in files:
    if f.name in ('firebase.js', 'firebase-lite.js', 'terkepadat.js'): continue
    s = f.read_text(encoding='utf-8')
    n = pat.sub(lambda m: m.group(1) + m.group(2) + ('' if m.group(2).startswith('http') else '?v=' + v) + m.group(3), s)
    if n != s: f.write_text(n, encoding='utf-8'); print('frissítve:', f.name)
print('verzió:', v)
