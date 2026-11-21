# Átemelőtelep – felhasznált anyagok

## Külső könyvtár

- **three.js r170** (`lib/three.module.min.js`, valamint a `lib/addons/` alatti EffectComposer, RenderPass, ShaderPass, MaskPass, Pass, UnrealBloomPass, CopyShader, LuminosityHighPassShader és BufferGeometryUtils fájlok).
  Forrás: https://github.com/mrdoob/three.js (r170 kiadás), a repóban tárolva; a kódon nem változtattunk, csak a belső importok kapnak `?v=` verziójelet a `tools/verzio.py` futtatásakor.
  Licenc: MIT, a teljes szöveg a `lib/LICENSE-three.txt` fájlban van.

## Saját készítésű tartalom

- Minden textúra (murva, beton, aszfalt, rozsda, hullámlemez, drótháló, víz normáltérkép, zseblámpa-maszk, feliratok) futás közben, kódból készül (`anyag.js`), külső képfájl nincs.
- Minden 3D modell kódból épül fel (`latvany.js`), külső modellfájl nincs.
- Minden hang és zene a böngésző WebAudio API-jával, futás közben szintetizálódik (`hang.js`), külső hangfájl nincs.
- Betűtípusok és ikonok: a HGWS oldal közös készletéből (Cinzel, Inter, `css/icons.css`).
