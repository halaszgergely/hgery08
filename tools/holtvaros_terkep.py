#!/usr/bin/env python3
"""Holtváros – a megyetérképek adatainak előállítása a Natural Earth (közkincs) 1:10m rétegeiből.

Használat: python3 tools/holtvaros_terkep.py <natural-earth geojson mappa>
Forrás: https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_*.geojson)
A megyehatár, a Duna és mellékágai, a kisebb folyók, a főutak, a vasutak és a beépített területek valós adatok.
A települések, parkok és hidak helye kézzel megadott, közelítő koordináta.
"""
import json, math, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '.'
K = 180                                   # képpont / km
load = lambda n: json.load(open(os.path.join(D, n)))['features']
lines = lambda g: g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
polys = lambda g: g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
flat = lambda pts: [round(v) for p in pts for v in p]
def chaikin(p, n=2):
    for _ in range(n):
        q = [p[0]]
        for a, b in zip(p, p[1:]): q += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        p = q + [p[-1]]
    return p
ADM = [f for f in load('ne_10m_admin_1_states_provinces.geojson') if f['properties'].get('iso_a2') == 'HU']
RIV1, RIV2, ROADS, RAILS, URB = load('ne_10m_rivers_lake_centerlines.geojson'), load('ne_10m_rivers_europe.geojson'), load('ne_10m_roads.geojson'), load('ne_10m_railroads.geojson'), load('ne_10m_urban_areas.geojson')

T_PEST = """Érd 18.913 47.392 70|Vác 19.134 47.775 35|Gödöllő 19.367 47.597 32|Cegléd 19.800 47.174 36|Szentendre 19.075 47.670 27|Dunakeszi 19.139 47.636 45|Szigetszentmiklós 19.043 47.345 40|Budaörs 18.958 47.461 29|Nagykőrös 19.778 47.034 23|Monor 19.447 47.351 18|Gyál 19.221 47.384 24|Vecsés 19.265 47.406 21|Dabas 19.311 47.187 17|Százhalombatta 18.911 47.326 18|Ráckeve 18.944 47.160 10|Aszód 19.478 47.652 6|Nagykáta 19.744 47.415 12|Pilisvörösvár 18.911 47.621 14|Szob 18.870 47.819 3|Abony 20.005 47.189 14|Albertirsa 19.610 47.243 12|Pomáz 19.027 47.647 17|Fót 19.189 47.618 20|Veresegyház 19.283 47.657 20|Göd 19.134 47.683 20|Dunaharaszti 19.098 47.354 23|Biatorbágy 18.820 47.471 14|Törökbálint 18.913 47.436 14|Pécel 19.342 47.489 16|Gyömrő 19.401 47.427 19|Üllő 19.355 47.387 12|Pilis 19.547 47.286 12|Örkény 19.433 47.130 5|Tura 19.601 47.607 8|Kistarcsa 19.262 47.547 13|Maglód 19.353 47.444 12|Budakeszi 18.930 47.511 15|Visegrád 18.971 47.785 2|Nagymaros 18.960 47.792 5|Zsámbék 18.720 47.548 5|Tököl 18.962 47.321 10|Kiskunlacháza 19.010 47.189 9|Ócsa 19.230 47.297 9|Sülysáp 19.534 47.452 8|Tápiószele 19.877 47.336 6|Isaszeg 19.401 47.531 11|Halásztelek 18.983 47.362 10|Diósd 18.947 47.409 10|Őrbottyán 19.283 47.687 7|Piliscsaba 18.829 47.635 8|Solymár 18.932 47.592 10|Nagykovácsi 18.883 47.578 8|Páty 18.829 47.517 8|Tárnok 18.859 47.372 10|Sóskút 18.827 47.406 3|Dömsöd 19.010 47.090 6|Szigethalom 19.003 47.322 18|Dunavarsány 19.066 47.279 8|Alsónémedi 19.159 47.316 5|Inárcs 19.327 47.262 5|Újhartyán 19.386 47.220 3|Kocsér 19.920 47.002 2|Ceglédbercel 19.668 47.224 4|Tápiószentmárton 19.747 47.340 5|Tápióbicske 19.687 47.362 3|Mende 19.456 47.431 4|Kóka 19.578 47.485 4|Dány 19.546 47.519 4|Valkó 19.513 47.563 2|Zsámbok 19.611 47.543 2|Galgahévíz 19.559 47.617 2|Bag 19.483 47.633 4|Kartal 19.531 47.670 6|Iklad 19.438 47.666 2|Galgamácsa 19.386 47.695 2|Vácrátót 19.234 47.710 2|Sződliget 19.147 47.731 5|Verőce 19.033 47.826 4|Kismaros 19.006 47.838 2|Nagybörzsöny 18.827 47.935 1|Vámosmikola 18.786 47.978 2|Perőcsény 18.860 48.000 0.5|Kemence 18.892 48.018 1|Bernecebaráti 18.914 48.037 1|Rád 19.218 47.790 2|Penc 19.246 47.801 1.5|Püspökhatvan 19.363 47.776 1.5|Acsa 19.386 47.797 1.5|Leányfalu 19.086 47.717 4|Tahitótfalu 19.078 47.752 6|Dunabogdány 19.041 47.791 3|Szigetmonostor 19.105 47.693 2.5|Budakalász 19.046 47.622 11|Csömör 19.228 47.550 10|Nagytarcsa 19.283 47.531 5|Kerepes 19.283 47.563 10|Mogyoród 19.243 47.598 7|Szada 19.317 47.633 6|Erdőkertes 19.308 47.673 8|Csomád 19.228 47.660 1.5|Péteri 19.410 47.391 2|Ecser 19.324 47.444 4|Felsőpakony 19.238 47.343 3.5|Bugyi 19.146 47.226 5|Délegyháza 19.091 47.243 4|Taksony 19.068 47.330 6|Majosháza 19.000 47.266 1.5|Áporka 19.011 47.230 1|Szigetbecse 18.948 47.130 1.3|Lórév 18.899 47.118 0.3|Apaj 19.090 47.113 1.2|Tatárszentgyörgy 19.375 47.076 2|Táborfalva 19.477 47.100 3.5|Pusztavacs 19.501 47.172 1.4|Csemő 19.692 47.117 4.5|Nyársapát 19.801 47.098 2|Törtel 19.936 47.122 4.5|Jászkarajenő 20.066 47.053 2.7|Kőröstetétlen 20.021 47.097 0.9|Újszilvás 19.922 47.274 2.7|Tápiógyörgye 19.952 47.335 3.5|Farmos 19.848 47.361 3.5|Szentmártonkáta 19.701 47.454 5|Tóalmás 19.666 47.508 3.3|Szentlőrinckáta 19.756 47.519 2|Úri 19.527 47.414 2.7|Gomba 19.531 47.371 3|Bénye 19.544 47.353 1.2|Káva 19.588 47.356 0.7|Pánd 19.636 47.353 2|Monorierdő 19.502 47.309 4.5|Nyáregyháza 19.502 47.262 3.8|Csévharaszt 19.427 47.293 2|Vasad 19.403 47.320 2|Hernád 19.432 47.162 4.3|Kakucs 19.365 47.243 3|Tinnye 18.778 47.620 1.7|Perbál 18.762 47.590 2.2|Tök 18.729 47.565 1.4|Budajenő 18.802 47.557 2|Telki 18.830 47.548 4|Herceghalom 18.741 47.498 2.5|Pusztazámor 18.781 47.402 1.2|Pilisszentiván 18.898 47.609 4.5|Pilisszántó 18.888 47.669 2.5|Pilisszentkereszt 18.905 47.692 2.2|Csobánka 18.962 47.646 3.3|Pilisjászfalu 18.795 47.656 1.7|Üröm 19.016 47.597 7.5|Pilisborosjenő 18.993 47.608 3.7|Remeteszőlős 18.930 47.557 0.9|Kisoroszi 19.012 47.810 1|Pócsmegyer 19.098 47.717 2.4|Zebegény 18.911 47.801 1.2|Ipolydamásd 18.830 47.841 0.4|Letkés 18.775 47.887 1.1|Ipolytölgyes 18.775 47.921 0.4|Márianosztra 18.871 47.865 0.9|Kóspallag 18.932 47.876 0.8|Szokolya 19.006 47.866 1.9|Vácduka 19.213 47.745 1.5|Váchartyán 19.257 47.724 2|Kisnémedi 19.289 47.739 0.7|Püspökszilágy 19.311 47.739 0.7|Vácegres 19.365 47.677 0.9|Váckisújfalu 19.349 47.706 0.5|Galgagyörk 19.377 47.741 1|Csővár 19.325 47.812 0.6|Verseg 19.546 47.722 1.3|Hévízgyörk 19.521 47.631 3|Domony 19.433 47.655 2.2|Vácszentlászló 19.537 47.573 2|Mikebuda 19.611 47.160 0.7|Dánszentmiklós 19.545 47.213 3|Makád 18.930 47.087 1.2|Szigetújfalu 18.924 47.236 2|Szigetcsép 18.969 47.265 2.3|Szigetszentmárton 18.960 47.227 2.2"""
T_GYOR = """Győr 17.635 47.687 130|Sopron 16.590 47.685 62|Mosonmagyaróvár 17.269 47.867 33|Csorna 17.250 47.611 10|Kapuvár 17.030 47.590 10|Pannonhalma 17.755 47.549 4|Tét 17.508 47.519 4|Fertőd 16.870 47.620 3.5|Fertőszentmiklós 16.875 47.590 4|Jánossomorja 17.136 47.786 6|Lébény 17.390 47.737 3|Beled 17.094 47.466 2.5|Abda 17.545 47.695 3|Győrújbarát 17.647 47.607 7|Nyúl 17.690 47.590 4.5|Écs 17.720 47.560 2|Töltéstava 17.730 47.630 2.3|Gönyű 17.825 47.735 3|Nagyszentjános 17.870 47.710 1.8|Bőny 17.870 47.650 2.2|Pér 17.807 47.612 2.5|Mezőörs 17.880 47.570 1|Koroncó 17.530 47.600 2|Rábapatona 17.480 47.630 2.5|Enese 17.420 47.647 1.8|Kóny 17.360 47.630 2.6|Ikrény 17.530 47.655 1.8|Öttevény 17.480 47.725 3|Kunsziget 17.520 47.740 1.2|Mosonszentmiklós 17.420 47.730 2.5|Kimle 17.370 47.820 2.2|Halászi 17.330 47.890 3|Dunakiliti 17.290 47.965 2|Rajka 17.200 48.000 2.7|Hegyeshalom 17.156 47.912 3.6|Bezenye 17.220 47.960 1.5|Levél 17.200 47.895 1.8|Mosonszolnok 17.180 47.850 1.7|Ásványráró 17.500 47.830 2|Hédervár 17.460 47.830 1.2|Dunaszeg 17.540 47.770 2|Győrladamér 17.560 47.755 1.6|Győrzámoly 17.580 47.740 2.8|Vámosszabadi 17.650 47.760 1.6|Nagycenk 16.698 47.605 2|Kópháza 16.640 47.640 2|Harka 16.600 47.635 2|Ágfalva 16.520 47.690 2|Fertőrákos 16.650 47.720 2.2|Hegykő 16.795 47.620 1.4|Fertőhomok 16.770 47.620 0.6|Sopronkövesd 16.745 47.545 1.2|Lövő 16.790 47.505 1.4|Nagylózs 16.770 47.565 1|Petőháza 16.895 47.595 1|Agyagosszergény 16.940 47.610 0.9|Vitnyéd 16.985 47.585 1.4|Himod 17.010 47.520 0.7|Babót 17.075 47.575 1.1|Farád 17.200 47.605 1.9|Rábatamási 17.170 47.590 1|Szany 17.300 47.465 2.2|Bágyogszovát 17.360 47.585 1.3|Rábacsanak 17.290 47.525 0.5|Bősárkány 17.250 47.690 2.1|Mórichida 17.420 47.515 0.8|Rábaszentmihály 17.430 47.575 0.5|Győrság 17.750 47.575 1.5|Ravazd 17.750 47.515 1.2|Győrasszonyfa 17.810 47.495 0.5|Veszprémvarsány 17.830 47.430 1|Bakonyszentlászló 17.800 47.390 1.8|Sokorópátka 17.695 47.490 1.1|Felpéc 17.600 47.520 0.9|Kajárpéc 17.630 47.490 1.3|Gyömöre 17.565 47.495 1.2|Szerecseny 17.550 47.460 0.8|Csikvánd 17.450 47.465 0.5|Gyarmat 17.490 47.460 1.3|Peresznye 16.650 47.425 0.9"""
T_BAZ = """Miskolc 20.780 48.100 150|Ózd 20.290 48.220 32|Kazincbarcika 20.620 48.250 26|Mezőkövesd 20.570 47.810 16|Tiszaújváros 21.045 47.930 15|Sátoraljaújhely 21.655 48.395 14|Sárospatak 21.570 48.320 12|Sajószentpéter 20.710 48.220 11|Edelény 20.730 48.295 9.5|Szerencs 21.205 48.160 9|Putnok 20.435 48.295 6.5|Felsőzsolca 20.860 48.105 6.5|Encs 21.120 48.330 6|Tokaj 21.410 48.120 4|Emőd 20.820 47.940 5|Nyékládháza 20.830 47.990 5|Alsózsolca 20.880 48.070 5.5|Onga 20.910 48.120 4.8|Szikszó 20.930 48.200 5.5|Mezőcsát 20.905 47.820 6|Tiszalúc 21.070 48.035 5|Sajóbábony 20.735 48.170 2.8|Szendrő 20.730 48.405 4|Borsodnádasd 20.250 48.120 3|Abaújszántó 21.190 48.280 3|Gönc 21.275 48.470 2|Cigánd 21.890 48.255 3|Rudabánya 20.625 48.375 2.5|Mályi 20.830 48.020 4|Kistokaj 20.840 48.040 2|Sajólád 20.900 48.040 3|Bőcs 20.970 48.045 2.7|Hernádnémeti 20.975 48.070 3.5|Gesztely 20.965 48.105 2.8|Arnót 20.860 48.130 2.5|Szirmabesenyő 20.800 48.150 4.3|Sajókeresztúr 20.775 48.165 1.5|Sajóvámos 20.830 48.180 2.2|Parasznya 20.640 48.170 1.2|Bükkszentkereszt 20.635 48.070 1.2|Répáshuta 20.525 48.050 0.4|Bükkaranyos 20.780 47.990 1.5|Harsány 20.745 47.970 2|Kisgyőr 20.690 48.010 1.6|Bogács 20.530 47.905 2|Cserépfalu 20.535 47.940 1|Tard 20.600 47.880 1.2|Mezőnyárád 20.675 47.860 1.6|Mezőkeresztes 20.690 47.830 3.8|Szentistván 20.660 47.770 2.4|Bükkábrány 20.680 47.890 1.5|Vatta 20.740 47.920 0.9|Hejőbába 20.945 47.905 1.9|Sajószöged 21.000 47.945 2.3|Tiszapalkonya 21.060 47.885 1.4|Nemesbikk 20.965 47.885 1|Igrici 20.885 47.865 1.2|Tiszakeszi 21.000 47.790 2.5|Ároktő 20.940 47.730 1.1|Tiszatarján 21.000 47.830 1.4|Taktaharkány 21.130 48.085 3.7|Prügy 21.245 48.085 2.5|Taktaszada 21.175 48.110 1.9|Mezőzombor 21.260 48.150 2.4|Mád 21.280 48.190 2.1|Tállya 21.230 48.235 1.9|Tarcal 21.340 48.130 2.9|Bodrogkeresztúr 21.360 48.160 1.1|Olaszliszka 21.430 48.245 1.6|Tolcsva 21.450 48.285 1.7|Bodrogolaszi 21.520 48.285 0.9|Hercegkút 21.530 48.335 0.6|Pálháza 21.510 48.470 1|Hollóháza 21.415 48.540 0.7|Füzér 21.455 48.540 0.4|Telkibánya 21.355 48.485 0.6|Hidasnémeti 21.230 48.500 1.1|Vizsoly 21.215 48.385 0.9|Boldogkőváralja 21.235 48.340 1|Forró 21.090 48.325 2.4|Novajidrány 21.170 48.395 1.4|Halmaj 21.000 48.245 1.8|Aszaló 20.965 48.220 1.9|Megyaszó 21.055 48.185 2.7|Monok 21.150 48.210 1.5|Hernádkak 20.960 48.090 1.6|Köröm 21.045 47.985 1.4|Kesznyéten 21.040 47.970 1.8|Múcsony 20.680 48.275 3|Izsófalva 20.655 48.305 1.7|Ormosbánya 20.650 48.335 1.5|Berente 20.665 48.240 1.1|Sajókaza 20.585 48.290 3.3|Sajóvelezd 20.460 48.270 0.8|Bánréve 20.355 48.300 1.2|Hangony 20.200 48.230 1.5|Domaháza 20.110 48.180 0.8|Arló 20.260 48.175 3.6|Járdánháza 20.250 48.155 1.7|Farkaslyuk 20.310 48.185 1.7|Csernely 20.340 48.145 0.7|Sáta 20.390 48.185 1|Nekézseny 20.430 48.170 0.7|Dédestapolcsány 20.485 48.180 1.4|Bánhorváti 20.500 48.225 1.3|Nagybarca 20.530 48.250 0.9|Tardona 20.530 48.170 1|Aggtelek 20.505 48.470 0.5|Jósvafő 20.550 48.485 0.2|Perkupa 20.685 48.470 0.8|Szalonna 20.740 48.450 1|Bódvaszilas 20.730 48.535 1|Tornanádaska 20.785 48.565 0.6|Hidvégardó 20.840 48.560 0.5|Krasznokvajda 20.970 48.470 0.4|Felsővadász 20.920 48.370 0.5|Szalaszend 21.120 48.385 1|Ricse 21.970 48.325 1.6|Karcsa 21.800 48.310 1.7|Pácin 21.830 48.330 1.3|Tiszakarád 21.720 48.200 2.2|Kenézlő 21.530 48.200 1.2|Zemplénagárd 22.070 48.360 0.7|Tiszacsermely 21.795 48.235 0.5|Vajdácska 21.655 48.320 1.2|Mikóháza 21.590 48.465 0.5|Erdőbénye 21.355 48.265 1|Golop 21.190 48.235 0.5|Bekecs 21.175 48.150 2.4|Legyesbénye 21.150 48.155 1.5|Újcsanálos 20.990 48.135 0.9"""

T_HB = """Debrecen 21.630 47.530 200|Hajdúböszörmény 21.510 47.670 30|Hajdúszoboszló 21.390 47.440 24|Balmazújváros 21.340 47.610 17|Hajdúnánás 21.430 47.840 17|Berettyóújfalu 21.540 47.220 15|Püspökladány 21.110 47.320 14|Hajdúhadház 21.670 47.680 13|Hajdúsámson 21.760 47.600 13|Derecske 21.570 47.350 9|Nádudvar 21.160 47.420 8.5|Polgár 21.110 47.870 8|Hajdúdorog 21.500 47.820 8.5|Nyíradony 21.910 47.690 7.5|Téglás 21.680 47.710 6.5|Kaba 21.280 47.360 6|Létavértes 21.880 47.380 7|Komádi 21.500 47.000 5|Biharkeresztes 21.720 47.130 4|Vámospércs 21.900 47.530 5.5|Tiszacsege 20.990 47.700 4.5|Egyek 20.890 47.630 5|Hosszúpályi 21.730 47.390 5.5|Nyírábrány 22.020 47.550 3.7|Mikepércs 21.630 47.440 4.8|Sáránd 21.630 47.400 2.3|Ebes 21.490 47.470 4.4|Bocskaikert 21.660 47.640 3.2|Hortobágy 21.150 47.580 1.4|Földes 21.360 47.290 4|Tetétlen 21.310 47.320 1.4|Hajdúszovát 21.480 47.390 3|Hajdúbagos 21.670 47.390 2|Pocsaj 21.810 47.280 2.6|Nagyrábé 21.330 47.200 2|Báránd 21.230 47.300 2.6|Sárrétudvari 21.190 47.240 2.8|Biharnagybajom 21.230 47.210 2.7|Csökmő 21.300 47.030 1.9|Zsáka 21.430 47.130 1.5|Furta 21.460 47.130 1|Görbeháza 21.240 47.830 2.4|Újszentmargita 21.100 47.730 1.4|Fülöp 22.060 47.600 1.7|Nyíracsád 21.970 47.600 3.7|Nyírmártonfalva 21.900 47.580 2|Álmosd 21.980 47.420 1.6|Bagamér 21.990 47.450 2.4|Monostorpályi 21.780 47.400 2.1|Konyár 21.670 47.320 2|Tépe 21.570 47.320 1.1|Esztár 21.780 47.280 1.3|Hencida 21.700 47.250 1.2|Gáborján 21.660 47.240 0.9|Szentpéterszeg 21.620 47.240 1.1|Váncsod 21.640 47.200 1.2|Mezősas 21.570 47.110 0.6|Körösszegapáti 21.630 47.040 0.9|Magyarhomorog 21.550 47.020 0.9|Darvas 21.340 47.100 0.5|Bakonszeg 21.440 47.190 1.1|Bihartorda 21.350 47.220 0.9|Szerep 21.140 47.230 1.5"""
T_CS = """Szeged 20.148 46.253 160|Hódmezővásárhely 20.320 46.420 43|Szentes 20.260 46.650 27|Makó 20.480 46.215 22|Csongrád 20.140 46.710 16|Kistelek 19.980 46.470 7|Mórahalom 19.880 46.220 6|Sándorfalva 20.100 46.360 8|Mindszent 20.190 46.520 6.5|Algyő 20.210 46.330 5.5|Deszk 20.240 46.220 3.6|Szatymaz 20.040 46.340 4.8|Domaszék 20.010 46.250 5|Röszke 20.030 46.190 3.3|Zákányszék 19.890 46.270 2.8|Ásotthalom 19.780 46.200 4|Üllés 19.850 46.340 3|Bordány 19.920 46.320 3.3|Forráskút 19.910 46.370 2.2|Zsombó 19.970 46.330 3.5|Balástya 20.000 46.420 3.4|Csengele 19.860 46.540 2|Pusztaszer 19.990 46.550 1.4|Ópusztaszer 20.090 46.490 2.2|Dóc 20.130 46.430 0.7|Baks 20.100 46.540 2|Csanytelek 20.120 46.600 2.7|Felgyő 20.110 46.660 1.2|Tömörkény 20.040 46.620 1.6|Szegvár 20.220 46.590 4.3|Nagymágocs 20.480 46.580 2.9|Derekegyház 20.350 46.580 1.5|Fábiánsebestyén 20.460 46.680 1.9|Eperjes 20.560 46.710 0.5|Árpádhalom 20.550 46.620 0.5|Székkutas 20.540 46.500 2.2|Mártély 20.240 46.470 1.3|Maroslele 20.350 46.270 2|Földeák 20.490 46.320 2.9|Apátfalva 20.580 46.170 2.9|Magyarcsanád 20.610 46.170 1.4|Csanádpalota 20.730 46.250 2.8|Nagylak 20.710 46.170 0.5|Pitvaros 20.740 46.320 1.3|Királyhegyes 20.610 46.270 0.6|Kiszombor 20.430 46.190 3.8|Ferencszállás 20.360 46.220 0.6|Tiszasziget 20.170 46.170 1.8|Újszentiván 20.180 46.190 1.7|Kübekháza 20.280 46.150 1.5|Pusztamérges 19.680 46.330 1.1|Öttömös 19.680 46.280 0.7|Ruzsa 19.750 46.290 2.4"""
T_BA = """Pécs 18.233 46.073 140|Komló 18.260 46.190 22|Mohács 18.680 45.990 17|Szigetvár 17.800 46.050 10|Siklós 18.300 45.855 9|Szentlőrinc 17.990 46.040 6.5|Kozármisleny 18.290 46.030 6.5|Pécsvárad 18.420 46.160 4|Bóly 18.520 45.970 4|Harkány 18.235 45.850 5|Villány 18.450 45.870 2.4|Sásd 18.110 46.250 3|Mágocs 18.230 46.350 2.3|Sellye 17.850 45.870 2.6|Pellérd 18.150 46.030 2.3|Orfű 18.140 46.150 1|Hosszúhetény 18.350 46.160 3.4|Magyarszék 18.190 46.190 1|Mánfa 18.240 46.160 0.8|Keszü 18.190 46.020 1.3|Szalánta 18.240 45.950 1.2|Újpetre 18.360 45.940 1|Vokány 18.340 45.910 0.8|Nagyharsány 18.390 45.850 1.5|Beremend 18.430 45.790 2.5|Drávaszabolcs 18.210 45.800 0.7|Vajszló 17.990 45.860 1.7|Szabadszentkirály 18.040 46.000 0.8|Bicsérd 18.080 46.020 1|Kővágószőlős 18.120 46.080 1.3|Abaliget 18.120 46.140 0.6|Bükkösd 17.990 46.110 1.1|Dencsháza 17.840 45.990 0.6|Nagypeterd 17.900 46.050 0.6|Mozsgó 17.850 46.110 1|Vásárosdombó 18.130 46.310 1|Mindszentgodisa 18.070 46.230 0.8|Egyházaskozár 18.320 46.330 0.8|Szászvár 18.370 46.280 2.3|Mecseknádasd 18.470 46.220 1.5|Hidas 18.500 46.260 2|Geresdlak 18.530 46.110 0.8|Véménd 18.610 46.150 1.3|Palotabozsok 18.640 46.130 0.9|Somberek 18.660 46.080 1.4|Dunaszekcső 18.760 46.080 1.8|Lánycsók 18.630 46.000 2.5|Babarc 18.550 46.000 0.7|Szederkény 18.460 46.000 1.8|Olasz 18.410 46.010 0.6|Bogád 18.320 46.090 1.1|Nagykozár 18.320 46.070 2|Pogány 18.260 45.980 1.3|Egerág 18.300 45.980 1|Majs 18.600 45.910 1|Sátorhely 18.630 45.940 0.6|Kölked 18.710 45.950 1|Homorúd 18.790 45.980 0.6|Magyarbóly 18.490 45.840 1|Lippó 18.570 45.860 0.5|Felsőszentmárton 17.700 45.850 0.9|Drávasztára 17.820 45.820 0.4|Kétújfalu 17.710 45.970 0.7"""

def build(key, title, county, cities, cap, T, extra=None):
    adm = {f['properties']['name']: f for f in ADM if f['properties']['name'] in [county] + cities}
    parts = lambda n: sorted(([q[:2] for q in po[0]] for po in polys(adm[n]['geometry'])), key=len, reverse=True)   # több részből álló megye: a legnagyobb a fő rész
    ring = lambda n: parts(n)[0]
    allp = [q for n in adm for pr in parts(n) for q in pr]
    LON0, LON1, LAT0, LAT1 = min(q[0] for q in allp) - .04, max(q[0] for q in allp) + .04, min(q[1] for q in allp) - .03, max(q[1] for q in allp) + .03
    KX, KY = 111.32 * math.cos(math.radians((LAT0 + LAT1) / 2)) * K, 111.19 * K
    W, H = round((LON1 - LON0) * KX), round((LAT1 - LAT0) * KY)
    P = lambda lon, lat: ((lon - LON0) * KX, (LAT1 - lat) * KY)
    M = 900
    inb = lambda p: -M <= p[0] <= W + M and -M <= p[1] <= H + M
    def clip(pts):
        out, cur = [], []
        for i, p in enumerate(pts):
            ok = inb(p) or (i > 0 and inb(pts[i - 1])) or (i + 1 < len(pts) and inb(pts[i + 1]))
            if ok: cur.append(p)
            elif cur: out.append(cur); cur = []
        if cur: out.append(cur)
        return [c for c in out if len(c) > 1]
    water = []
    for f in RIV1:
        nm = f['properties'].get('name') or ''
        if not f['geometry']: continue
        for l in lines(f['geometry']):
            for c in clip([P(*q[:2]) for q in l]): water.append((0 if nm == 'Danube' else 1, 84 if nm == 'Danube' else 44 if nm in ('Tisza', 'Tisa') else 40, chaikin(c)))
    for f in RIV2:
        if not f['geometry']: continue
        for l in lines(f['geometry']):
            for c in clip([P(*q[:2]) for q in l]): water.append((2, 18, chaikin(c)))
    water.sort(key=lambda w: (w[0], -len(w[2])))
    roads, rails, urban = [], [], []
    for f in ROADS:
        if not f['geometry']: continue
        t = {'Major Highway': 2, 'Secondary Highway': 1}.get(f['properties'].get('type'), 0)
        for l in lines(f['geometry']):
            for c in clip([P(*q[:2]) for q in l]): roads.append([t, flat(c)])
    for f in RAILS:
        if not f['geometry']: continue
        for l in lines(f['geometry']):
            for c in clip([P(*q[:2]) for q in l]): rails.append(flat(c))
    for f in URB:
        for po in polys(f['geometry']):
            r = [P(*q[:2]) for q in po[0]]
            if any(0 <= p[0] <= W and 0 <= p[1] <= H for p in r): urban.append(flat(r))
    towns = []
    for t in T.split('|'):
        n, lo, la, pop = t.rsplit(' ', 3); x, y = P(float(lo), float(la)); towns.append([n, round(x), round(y), float(pop)])
    out = dict(id=key, title=title, W=W, H=H, K=K, county=flat([P(*q) for q in ring(county)]), cities=[[n.replace('ô', 'ő'), flat([P(*q) for q in ring(n)])] for n in cities] + [['', flat([P(*q) for q in pr])] for pr in parts(county)[1:]],
               water=[[w[1], flat(w[2])] for w in water], roads=roads, rails=rails, urban=urban, towns=towns, cap=[cap[0], *map(round, P(cap[1], cap[2]))], parks=[], woods=[], labels=[])
    if extra: extra(out, P, water)
    print(key, W, H, len(water), len(roads), len(rails), len(urban), len(towns))
    return out

def pest_extra(out, P, water):
    danube = water[0][2]
    def dx(lat, near_lon=19.045):             # a Duna x-koordinátája adott szélességen
        y, x0, best = P(0, lat)[1], P(near_lon, lat)[0], None
        for a, b in zip(danube, danube[1:]):
            if (a[1] - y) * (b[1] - y) <= 0 and a[1] != b[1]:
                x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
                if best is None or abs(x - x0) < abs(best - x0): best = x
        return best, y
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
    out.update(center=[round(center[0]), round(center[1])], bridges=bridges, parks=parks, woods=woods, labels=labels)

def ell_of(P):
    return lambda lo, la, rx, ry, n: [round(P(lo, la)[0]), round(P(lo, la)[1]), round(rx * K), round(ry * K), n]
def gyor_extra(out, P, water):
    e = ell_of(P); out['woods'] = [e(17.75, 47.50, 6, 5, 'Sokoró'), e(16.52, 47.66, 4, 4, 'Soproni-hegység'), e(17.05, 47.68, 9, 4, 'Hanság'), e(17.45, 47.86, 9, 3, 'Szigetköz')]
    out['parks'] = [e(16.76, 47.70, 4.5, 6, 'Fertő tó')]
def baz_extra(out, P, water):
    e = ell_of(P); out['woods'] = [e(20.52, 48.07, 14, 9, 'Bükk'), e(21.35, 48.40, 12, 14, 'Zempléni-hegység'), e(20.55, 48.45, 9, 5, 'Aggteleki-karszt'), e(20.80, 48.40, 6, 5, 'Cserehát')]

maps = [build('pest', 'Pest megye', 'Pest', ['Budapest', 'Érd'], ('BUDAPEST', 19.054, 47.498), T_PEST, pest_extra),
        build('gyor', 'Győr-Moson-Sopron', 'Gyor-Moson-Sopron', ['Gyôr', 'Sopron'], ('GYŐR', 17.635, 47.687), T_GYOR, gyor_extra),
        build('miskolc', 'Borsod-Abaúj-Zemplén', 'Borsod-Abaúj-Zemplén', ['Miskolc'], ('MISKOLC', 20.78, 48.10), T_BAZ, baz_extra),
        build('debrecen', 'Hajdú-Bihar', 'Hajdú-Bihar', ['Debrecen'], ('DEBRECEN', 21.63, 47.53), T_HB, lambda o, P, w: o.update(woods=[ell_of(P)(21.15, 47.60, 12, 8, 'Hortobágy'), ell_of(P)(21.75, 47.58, 4, 5, 'Nagyerdő')])),
        build('szeged', 'Csongrád-Csanád', 'Csongrád', ['Szeged', 'Hódmezôvásárhely'], ('SZEGED', 20.148, 46.253), T_CS, lambda o, P, w: o.update(woods=[ell_of(P)(19.80, 46.27, 7, 5, 'Homokhátság')])),
        build('pecs', 'Baranya', 'Baranya', ['Pécs'], ('PÉCS', 18.233, 46.073), T_BA, lambda o, P, w: o.update(woods=[ell_of(P)(18.22, 46.13, 13, 5, 'Mecsek'), ell_of(P)(18.40, 45.87, 6, 2, 'Villányi-hegység')]))]
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'arcade-zombi-map.js')
open(dst, 'w').write('/* Holtváros – megyetérképek. Generálta: tools/holtvaros_terkep.py\n   Megyehatár, folyók, főutak, vasutak, beépített területek: Natural Earth (közkincs, naturalearthdata.com). */\nwindow.HGZMaps = ' + json.dumps(maps, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(os.path.getsize(dst), 'bájt')
