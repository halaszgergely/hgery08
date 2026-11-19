#!/usr/bin/env python3
"""Holtváros – Pest megye térképadatainak előállítása a Natural Earth (közkincs) 1:10m rétegeiből.

Használat: python3 tools/holtvaros_terkep.py <natural-earth geojson mappa>
Forrás: https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_*.geojson)
A megyehatár, a Duna és mellékágai, a kisebb folyók, a főutak, a vasutak és a beépített területek valós adatok.
A települések, parkok és hidak helye kézzel megadott, közelítő koordináta.
"""
import json, math, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '.'
K = 180                                   # képpont / km
LON0, LAT1, LON1, LAT0 = 18.645, 48.085, 20.245, 46.915
KX, KY = 111.32 * math.cos(math.radians(47.5)) * K, 111.19 * K
W, H = round((LON1 - LON0) * KX), round((LAT1 - LAT0) * KY)
P = lambda lon, lat: ((lon - LON0) * KX, (LAT1 - lat) * KY)
load = lambda n: json.load(open(os.path.join(D, n)))['features']
lines = lambda g: g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
polys = lambda g: g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
M = 900                                   # ráhagyás a pálya szélén túl
inb = lambda p: -M <= p[0] <= W + M and -M <= p[1] <= H + M
def clip(pts):                            # a pályán kívüli szakaszok elhagyása, darabolással
    out, cur = [], []
    for i, p in enumerate(pts):
        ok = inb(p) or (i > 0 and inb(pts[i - 1])) or (i + 1 < len(pts) and inb(pts[i + 1]))
        if ok: cur.append(p)
        elif cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return [c for c in out if len(c) > 1]
def chaikin(p, n=2):
    for _ in range(n):
        q = [p[0]]
        for a, b in zip(p, p[1:]): q += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        p = q + [p[-1]]
    return p
flat = lambda pts: [round(v) for p in pts for v in p]

adm = {f['properties']['name']: f for f in load('ne_10m_admin_1_states_provinces.geojson') if f['properties'].get('iso_a2') == 'HU' and f['properties'].get('name') in ('Pest', 'Budapest')}
county = [P(*q[:2]) for q in polys(adm['Pest']['geometry'])[0][0]]
bp = [P(*q[:2]) for q in polys(adm['Budapest']['geometry'])[0][0]]

water = []
for f in load('ne_10m_rivers_lake_centerlines.geojson'):
    nm = f['properties'].get('name') or ''
    if not f['geometry']: continue
    for l in lines(f['geometry']):
        for c in clip([P(*q[:2]) for q in l]): water.append((0 if nm == 'Danube' else 1, 84 if nm == 'Danube' else 40, chaikin(c)))
for f in load('ne_10m_rivers_europe.geojson'):
    if not f['geometry']: continue
    for l in lines(f['geometry']):
        for c in clip([P(*q[:2]) for q in l]): water.append((2, 16, chaikin(c)))
water.sort(key=lambda w: (w[0], -len(w[2])))
danube = water[0][2]
def dx(lat, near_lon=19.045):             # a Duna x-koordinátája adott szélességen
    y, x0, best = P(0, lat)[1], P(near_lon, lat)[0], None
    for a, b in zip(danube, danube[1:]):
        if (a[1] - y) * (b[1] - y) <= 0 and a[1] != b[1]:
            x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
            if best is None or abs(x - x0) < abs(best - x0): best = x
    return best, y

roads = []
for f in load('ne_10m_roads.geojson'):
    if not f['geometry']: continue
    t = {'Major Highway': 2, 'Secondary Highway': 1}.get(f['properties'].get('type'), 0)
    for l in lines(f['geometry']):
        for c in clip([P(*q[:2]) for q in l]): roads.append([t, flat(c)])
rails = []
for f in load('ne_10m_railroads.geojson'):
    if not f['geometry']: continue
    for l in lines(f['geometry']):
        for c in clip([P(*q[:2]) for q in l]): rails.append(flat(c))
urban = []
for f in load('ne_10m_urban_areas.geojson'):
    for po in polys(f['geometry']):
        r = [P(*q[:2]) for q in po[0]]
        if any(0 <= p[0] <= W and 0 <= p[1] <= H for p in r): urban.append(flat(r))

T = """Érd 18.913 47.392 70|Vác 19.134 47.775 35|Gödöllő 19.367 47.597 32|Cegléd 19.800 47.174 36|Szentendre 19.075 47.670 27|Dunakeszi 19.139 47.636 45|Szigetszentmiklós 19.043 47.345 40|Budaörs 18.958 47.461 29|Nagykőrös 19.778 47.034 23|Monor 19.447 47.351 18|Gyál 19.221 47.384 24|Vecsés 19.265 47.406 21|Dabas 19.311 47.187 17|Százhalombatta 18.911 47.326 18|Ráckeve 18.944 47.160 10|Aszód 19.478 47.652 6|Nagykáta 19.744 47.415 12|Pilisvörösvár 18.911 47.621 14|Szob 18.870 47.819 3|Abony 20.005 47.189 14|Albertirsa 19.610 47.243 12|Pomáz 19.027 47.647 17|Fót 19.189 47.618 20|Veresegyház 19.283 47.657 20|Göd 19.134 47.683 20|Dunaharaszti 19.098 47.354 23|Biatorbágy 18.820 47.471 14|Törökbálint 18.913 47.436 14|Pécel 19.342 47.489 16|Gyömrő 19.401 47.427 19|Üllő 19.355 47.387 12|Pilis 19.547 47.286 12|Örkény 19.433 47.130 5|Tura 19.601 47.607 8|Kistarcsa 19.262 47.547 13|Maglód 19.353 47.444 12|Budakeszi 18.930 47.511 15|Visegrád 18.971 47.785 2|Nagymaros 18.960 47.792 5|Zsámbék 18.720 47.548 5|Tököl 18.962 47.321 10|Kiskunlacháza 19.010 47.189 9|Ócsa 19.230 47.297 9|Sülysáp 19.534 47.452 8|Tápiószele 19.877 47.336 6|Isaszeg 19.401 47.531 11|Halásztelek 18.983 47.362 10|Diósd 18.947 47.409 10|Őrbottyán 19.283 47.687 7|Piliscsaba 18.829 47.635 8|Solymár 18.932 47.592 10|Nagykovácsi 18.883 47.578 8|Páty 18.829 47.517 8|Tárnok 18.859 47.372 10|Sóskút 18.827 47.406 3|Dömsöd 19.010 47.090 6|Szigethalom 19.003 47.322 18|Dunavarsány 19.066 47.279 8|Alsónémedi 19.159 47.316 5|Inárcs 19.327 47.262 5|Újhartyán 19.386 47.220 3|Kocsér 19.920 47.002 2|Ceglédbercel 19.668 47.224 4|Tápiószentmárton 19.747 47.340 5|Tápióbicske 19.687 47.362 3|Mende 19.456 47.431 4|Kóka 19.578 47.485 4|Dány 19.546 47.519 4|Valkó 19.513 47.563 2|Zsámbok 19.611 47.543 2|Galgahévíz 19.559 47.617 2|Bag 19.483 47.633 4|Kartal 19.531 47.670 6|Iklad 19.438 47.666 2|Galgamácsa 19.386 47.695 2|Vácrátót 19.234 47.710 2|Sződliget 19.147 47.731 5|Verőce 19.033 47.826 4|Kismaros 19.006 47.838 2|Nagybörzsöny 18.827 47.935 1|Vámosmikola 18.786 47.978 2|Perőcsény 18.860 48.000 0.5|Kemence 18.892 48.018 1|Bernecebaráti 18.914 48.037 1|Rád 19.218 47.790 2|Penc 19.246 47.801 1.5|Püspökhatvan 19.363 47.776 1.5|Acsa 19.386 47.797 1.5|Leányfalu 19.086 47.717 4|Tahitótfalu 19.078 47.752 6|Dunabogdány 19.041 47.791 3|Szigetmonostor 19.105 47.693 2.5|Budakalász 19.046 47.622 11|Csömör 19.228 47.550 10|Nagytarcsa 19.283 47.531 5|Kerepes 19.283 47.563 10|Mogyoród 19.243 47.598 7|Szada 19.317 47.633 6|Erdőkertes 19.308 47.673 8|Csomád 19.228 47.660 1.5|Péteri 19.410 47.391 2|Ecser 19.324 47.444 4|Felsőpakony 19.238 47.343 3.5|Bugyi 19.146 47.226 5|Délegyháza 19.091 47.243 4|Taksony 19.068 47.330 6|Majosháza 19.000 47.266 1.5|Áporka 19.011 47.230 1|Szigetbecse 18.948 47.130 1.3|Lórév 18.899 47.118 0.3|Apaj 19.090 47.113 1.2|Tatárszentgyörgy 19.375 47.076 2|Táborfalva 19.477 47.100 3.5|Pusztavacs 19.501 47.172 1.4|Csemő 19.692 47.117 4.5|Nyársapát 19.801 47.098 2|Törtel 19.936 47.122 4.5|Jászkarajenő 20.066 47.053 2.7|Kőröstetétlen 20.021 47.097 0.9|Újszilvás 19.922 47.274 2.7|Tápiógyörgye 19.952 47.335 3.5|Farmos 19.848 47.361 3.5|Szentmártonkáta 19.701 47.454 5|Tóalmás 19.666 47.508 3.3|Szentlőrinckáta 19.756 47.519 2|Úri 19.527 47.414 2.7|Gomba 19.531 47.371 3|Bénye 19.544 47.353 1.2|Káva 19.588 47.356 0.7|Pánd 19.636 47.353 2|Monorierdő 19.502 47.309 4.5|Nyáregyháza 19.502 47.262 3.8|Csévharaszt 19.427 47.293 2|Vasad 19.403 47.320 2|Hernád 19.432 47.162 4.3|Kakucs 19.365 47.243 3|Tinnye 18.778 47.620 1.7|Perbál 18.762 47.590 2.2|Tök 18.729 47.565 1.4|Budajenő 18.802 47.557 2|Telki 18.830 47.548 4|Herceghalom 18.741 47.498 2.5|Pusztazámor 18.781 47.402 1.2|Pilisszentiván 18.898 47.609 4.5|Pilisszántó 18.888 47.669 2.5|Pilisszentkereszt 18.905 47.692 2.2|Csobánka 18.962 47.646 3.3|Pilisjászfalu 18.795 47.656 1.7|Üröm 19.016 47.597 7.5|Pilisborosjenő 18.993 47.608 3.7|Remeteszőlős 18.930 47.557 0.9|Kisoroszi 19.012 47.810 1|Pócsmegyer 19.098 47.717 2.4|Zebegény 18.911 47.801 1.2|Ipolydamásd 18.830 47.841 0.4|Letkés 18.775 47.887 1.1|Ipolytölgyes 18.775 47.921 0.4|Márianosztra 18.871 47.865 0.9|Kóspallag 18.932 47.876 0.8|Szokolya 19.006 47.866 1.9|Vácduka 19.213 47.745 1.5|Váchartyán 19.257 47.724 2|Kisnémedi 19.289 47.739 0.7|Püspökszilágy 19.311 47.739 0.7|Vácegres 19.365 47.677 0.9|Váckisújfalu 19.349 47.706 0.5|Galgagyörk 19.377 47.741 1|Csővár 19.325 47.812 0.6|Verseg 19.546 47.722 1.3|Hévízgyörk 19.521 47.631 3|Domony 19.433 47.655 2.2|Vácszentlászló 19.537 47.573 2|Mikebuda 19.611 47.160 0.7|Dánszentmiklós 19.545 47.213 3|Makád 18.930 47.087 1.2|Szigetújfalu 18.924 47.236 2|Szigetcsép 18.969 47.265 2.3|Szigetszentmárton 18.960 47.227 2.2"""
towns = []
for t in T.split('|'):
    n, lo, la, pop = t.rsplit(' ', 3); x, y = P(float(lo), float(la)); towns.append([n, round(x), round(y), float(pop)])

km = K
riv = lambda lat, dkm: (dx(lat)[0] + dkm * km, dx(lat)[1])
center = riv(47.498, 0.95)
bridges = [[n, *map(round, dx(lat))] for n, lat in [('Megyeri híd', 47.609), ('Árpád híd', 47.537), ('Margit híd', 47.515), ('Lánchíd', 47.499), ('Erzsébet híd', 47.4905), ('Szabadság híd', 47.4835), ('Petőfi híd', 47.476), ('Rákóczi híd', 47.467), ('Deák Ferenc híd', 47.386)]]
ell = lambda p, rx, ry, n: [round(p[0]), round(p[1]), round(rx * km), round(ry * km), n]
parks = [ell(riv(47.527, 0), .17, 1.05, 'Margit-sziget'), ell(riv(47.556, 0), .17, .8, 'Óbudai-sziget'), ell(riv(47.487, -.75), .5, .6, 'Gellért-hegy'), ell(riv(47.515, 2.9), .75, .6, 'Városliget'), ell(riv(47.478, 4.0), .7, .6, 'Népliget'),
         ell(P(18.955, 47.515), 1.9, 2.3, 'Budai-hegyek'), ell(P(19.00, 47.555), 1.2, .9, 'Hármashatár-hegy'), ell(P(18.985, 47.43), 1.1, .9, 'Kamaraerdő')]
woods = [ell(P(18.93, 47.72), 9, 5, 'Pilis'), ell(P(18.93, 47.93), 9, 7, 'Börzsöny'), ell(P(19.42, 47.57), 6, 5, 'Gödöllői-dombság'), ell(P(19.05, 47.74), 1.2, 6, 'Szentendrei-sziget'), ell(P(19.25, 47.80), 5, 3, 'Cserhátalja'), ell(P(19.45, 47.05), 8, 4, 'Kiskunság')]
lab = lambda p, n, s: [round(p[0]), round(p[1]), n, s]
labels = [lab(riv(47.501, -1.0), 'Vár', 12), lab(riv(47.507, .5), 'Parlament', 11)] + [lab(P(lo, la), n, 22) for n, lo, la in [('Óbuda', 19.035, 47.55), ('Újpest', 19.095, 47.565), ('Angyalföld', 19.075, 47.535), ('Zugló', 19.115, 47.52), ('Kőbánya', 19.15, 47.48), ('Kispest', 19.14, 47.45), ('Ferencváros', 19.085, 47.468), ('Kelenföld', 19.03, 47.463), ('Budafok', 19.03, 47.425), ('Csepel', 19.075, 47.42), ('Rákospalota', 19.135, 47.565), ('Mátyásföld', 19.21, 47.51), ('Pesterzsébet', 19.11, 47.435), ('Soroksár', 19.12, 47.40), ('Rákoskeresztúr', 19.25, 47.48), ('Hűvösvölgy', 18.96, 47.545)]]
out = dict(W=W, H=H, K=K, county=flat(county), bp=flat(bp), water=[[w[1], flat(w[2])] for w in water], roads=roads, rails=rails, urban=urban, towns=towns, center=[round(center[0]), round(center[1])], bridges=bridges, parks=parks, woods=woods, labels=labels)
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'arcade-zombi-map.js')
open(dst, 'w').write('/* Holtváros – Pest megye térképadatai. Generálta: tools/holtvaros_terkep.py\n   Megyehatár, folyók, főutak, vasutak, beépített területek: Natural Earth (közkincs, naturalearthdata.com). */\nwindow.HGZMap = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(W, H, len(water), len(roads), len(rails), len(urban), len(towns), os.path.getsize(dst), 'bájt', 'közép', center, bridges[:3])
