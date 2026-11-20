
import { useState, useRef } from "react";

const RAW_QUESTIONS = [{"q":"\"A bírák függetlenek, és csak a törvénynek vannak alárendelve, továbbá ítélkezési tevékenységükkel összefüggésben nem befolyásolhatók és nem utasíthatók.\"","a":"IGAZ","t":"IF"},{"q":"\"A képviseleti demokrácia akkor valósul meg, amikor a nép közvetlenül gyakorolja a hatalmat, míg közvetlen demokráciáról akkor beszélünk, amikor az állampolgár az általa választott képviselők útján gyakorolja a közhatalmat.\"","a":"HAMIS","t":"IF"},{"q":"A „Titkos!"minősítésű adatot alapesetben max. 30 évre lehet minősíteni.","a":"IGAZ","t":"IF"},{"q":"A 2011-es népszámláskor a szomszédos 7 országban 2,2 millióan vallották magukat magyarnak.","a":"IGAZ","t":"IF"},{"q":"A besorolási osztályok fizetési fokozatok szerint tagolódnak.","a":"IGAZ","t":"IF"},{"q":"A bíró köteles az ítélkezése során a Bíróság elnökének utasításait betartani.","a":"HAMIS","t":"IF"},{"q":"A bírói és a közigazgatási jogalkalmazás azonos fogalmak.","a":"HAMIS","t":"IF"},{"q":"A bíróság többnyire hivatalból járhat el.","a":"HAMIS","t":"IF"},{"q":"A bírósági felülvizsgálat feltétele, hogy az ügyfél a jogerős határozatot jogsértőnek tartja.","a":"IGAZ","t":"IF"},{"q":"A bírósági jogalkalmazás a végrehajtó hatalmi ághoz tartozik.","a":"HAMIS","t":"IF"},{"q":"A dekoncentrált államigazgatási szerveknek hatósági jogkörük van, tehát engedélyezhetnek, tilthatnak, bírságolhatnak.","a":"IGAZ","t":"IF"},{"q":"A dokumentum továbbítása történhet az átadókönyv segítségével.","a":"IGAZ","t":"IF"},{"q":"A fellebbezésben új tények és bizonyítékok is felhozhatók.","a":"IGAZ","t":"IF"},{"q":"A felügyeleti eljárás során a felettes (felügyeleti) szerv vizsgálhatja a neki alárendelt hatóságok eljárását.","a":"IGAZ","t":"IF"},{"q":"A hatékonyság az erőforrások bármelyik csoportjára vonatkozik.","a":"IGAZ","t":"IF"},{"q":"A hatóság az ügy érdemében (az alapeljárás lezárásakor) végzést bocsát ki.","a":"HAMIS","t":"IF"},{"q":"A hatósági eljárásban olyan bizonyíték használható fel, amely alkalmas a tényállás tisztázásának megkönnyítésére.","a":"IGAZ","t":"IF"},{"q":"A hatóságok jogalkalmazó tevékenységük mellett egyéb közhatalmi funkciókat is ellátnak.","a":"IGAZ","t":"IF"},{"q":"A helyi adók bevezetésére rendeleti úton kizárólag a települési önkormányzatok jogosultak.","a":"IGAZ","t":"IF"},{"q":"A helyi önkormányzat kötelező feladata a közművelődés biztosítása.","a":"HAMIS","t":"IF"},{"q":"A helyi önkormányzatok alkotmányos jogállásukra nézve az államigazgatás részei, nem önálló hatalmi tényezők.","a":"HAMIS","t":"IF"},{"q":"A helyi önkormányzatok kötelező feladata a parkolás biztosítása.","a":"IGAZ","t":"IF"},{"q":"A helyi önkormányzatok, mint a helyi közhatalomgyakorlás szervei a helyi közügyekben önállóan járnak el.","a":"IGAZ","t":"IF"},{"q":"A jelenleg hatályos jogszabály alapján van államtitokköri jegyzék.","a":"HAMIS","t":"IF"},{"q":"A jogalkalmazás eredményeként kibocsátott közigazgatási aktus a jövőre nézve hoz létre jogokat, kötelezettségeket.","a":"IGAZ","t":"IF"},{"q":"A jogi személyeknek vannak személyes adataik.","a":"HAMIS","t":"IF"},{"q":"A jogvitát eldöntő jogalkalmazói tevékenység egy később létrejövő jogviszonyt kíván megítélni.","a":"HAMIS","t":"IF"},{"q":"A jövőbeni felhasználásra történő \"készletező\" adatgyűjtés jogszerű.","a":"HAMIS","t":"IF"},{"q":"A katonák a Magyary Program személyzet fogalmának személyi hatálya alá tartoznak.","a":"IGAZ","t":"IF"},{"q":"A képviselő-testület akkor határozatképes, ha az ülésen a települési képviselőknek több, mint a kétharmada jelen van.","a":"HAMIS","t":"IF"},{"q":"A kérelmet mindig tartalma alapján kell megítélni, még akkor is, ha az nem azonos azzal a megnevezéssel, amelyet az ügyfél a kérelmében nevesített.","a":"IGAZ","t":"IF"},{"q":"A kiadmányozásra jogosultak személyét az adott közigazgatási szerv szervezeti és működési szabályzatában rögzítik.","a":"IGAZ","t":"IF"},{"q":"A kiválasztási eljárás során a pályáztatás minden esetben kötelező.","a":"HAMIS","t":"IF"},{"q":"A Kormány autonóm (PRIMER) és végrehajtási (szekunder) típusú rendeleteket bocsát ki.","a":"IGAZ","t":"IF"},{"q":"A Kormány üléseire általában hetenként egyszer kerül sor.","a":"IGAZ","t":"IF"},{"q":"A kormánybizottság helyi illetékességgel rendelkezik.","a":"HAMIS","t":"IF"},{"q":"A kormánymegbízott felett - a kinevezés és a felmentés kivételével - a munkáltatói jogokat a miniszter gyakorolja.","a":"IGAZ","t":"IF"},{"q":"A kormányrendeletet a miniszterelnök írja alá.","a":"IGAZ","t":"IF"},{"q":"A kormánytagok rendeletei csak végrehajtási típusúak lehetnek.","a":"HAMIS","t":"IF"},{"q":"A kormánytisztviselő mentesül a munkavégzés alól a kötelező orvosi vizsgálat időtartamára.","a":"IGAZ","t":"IF"},{"q":"A kóros szenvedélyre vonatkozó adat különleges adatnak minősül.","a":"IGAZ","t":"IF"},{"q":"A költségvetés végrehajtásának ellenőrzése a költségvetési évet követő évben történik.","a":"IGAZ","t":"IF"},{"q":"A költségvetési forrásokat használó beruházások üzleti titoknak minősülnek.","a":"HAMIS","t":"IF"},{"q":"A költségvetési szervek önállóan működő és gazdálkodó szervekből és önállóan működő szervekből állnak.","a":"IGAZ","t":"IF"},{"q":"A közfeladatot ellátó szerv hány nap alatt kell, eleget tegyen az adatigénynek?","a":"15 nap","t":"MC"},{"q":"A kötelező adatkezelést önkormányzati rendelet is lehetővé teheti.","a":"IGAZ","t":"IF"},{"q":"A közigazgatás működése alapvetően jogalkalmazás.","a":"IGAZ","t":"IF"},{"q":"A közigazgatási és az igazságszolgáltatási jogalkalmazás azonos tevékenység.","a":"HAMIS","t":"IF"},{"q":"A közigazgatási hatósági jogalkalmazói tevékenység a bírói jogalkalmazás egyik speciális formája.","a":"HAMIS","t":"IF"},{"q":"A közigazgatási szervek jogalkalmazó tevékenysége az ügyfél kérelmére vagy hivatalból kerül sor.","a":"IGAZ","t":"IF"},{"q":"A közigazgatási változások két alapvető típusa a reform és az innováció.","a":"IGAZ","t":"IF"},{"q":"A közjogi szervezetszabályozó eszközök az állampolgárok számára jogokat és kötelezettségeket közvetlenül megállapíthatnak.","a":"HAMIS","t":"IF"},{"q":"A központi bank többféle eszközzel befolyásolja a gazdaságban lévő pénz mennyiségét.","a":"IGAZ","t":"IF"},{"q":"A köztársasági elnök az elfogadott törvényt alkotmányossági vizsgálatra megküldheti az Alkotmánybíróságnak.","a":"IGAZ","t":"IF"},{"q":"A köztársasági elnök dönt az állampolgárság megszerzésével és megszűnésével kapcsolatos ügyekben.","a":"IGAZ","t":"IF"},{"q":"A köztársasági elnök személye sérthetetlen, és döntéseiért sem politikai, sem jogi felelősséggel nem tartozik.","a":"IGAZ","t":"IF"},{"q":"A köztisztviselő a hozzátartozójával nem állhat irányítási, felügyeleti, ellenőrzési vagy elszámolási viszonyban.","a":"IGAZ","t":"IF"},{"q":"A köztisztviselőnek meg kell tagadnia azt az utasítást, amelynek teljesítésével bűncselekményt követne el.","a":"IGAZ","t":"IF"},{"q":"A Közszolgálati Törvényszék az uniós alkalmazottak munkaügyi vitáiban jár el.","a":"IGAZ","t":"IF"},{"q":"A legtöbb közigazgatási ügy hivatalból indul.","a":"HAMIS","t":"IF"},{"q":"A Liszaboni Szerződés az Európai Uniót jogi személlyé tette.","a":"IGAZ","t":"IF"},{"q":"A Magyar Nemzeti Bank milyen jogszabályt hozhat?","a":"Rendeletet","t":"MC"},{"q":"A Magyar Népköztársaság Elnöki Tanácsa mint jogalkotó szerv mikor szűnt meg?","a":"1989","t":"MC"},{"q":"A Magyary Program egyik stratégiai célkitűzése a belső eljárások racionalizálása.","a":"IGAZ","t":"IF"},{"q":"A Magyary Program értelmezésében melyik nem a feladat kötelező tartalmi eleme?","a":"FEDEZET","t":"MC"},{"q":"A Magyary Program hatékonyság-fogalmának mely összetevőjére jellemző: a feladatvégrehajtás egy nagyobb folyamat részeként értelmezhető?","a":"ALKALMAZKODÓ","t":"MC"},{"q":"A Magyary Program részeként mi a neve annak a tervnek, amely a legmegfelelőbb elhelyezés és felszerelés biztosítását tűzi ki célul?","a":"Ereky terv","t":"MC"},{"q":"A minisztériumokat milyen jogszabály határozza meg?","a":"Magyarország minisztériumainak felsorolásáról szóló törvény","t":"MC"},{"q":"A minisztert rendelet kiadásában az államtitkár helyettesítheti.","a":"HAMIS","t":"IF"},{"q":"A minősítés a teljesítményértékelés eredményén alapul.","a":"IGAZ","t":"IF"},{"q":"A munkajog alapjogszabálya a Munka Törvénykönyve (Mt.).","a":"IGAZ","t":"IF"},{"q":"A munkáltató a felmentést úgy köteles megindokolni, hogy abból a felmentés oka világosan kitűnjön.","a":"IGAZ","t":"IF"},{"q":"A nemzeti és etnikai hovatartozásra vonatkozó adat különleges adatnak minősül.","a":"IGAZ","t":"IF"},{"q":"A New Public Management a közigazgatási fejlődés csúcsa, végpontja.","a":"HAMIS","t":"IF"},{"q":"A normatív utasítás kibocsátására - csakúgy, mint a normatív határozat esetében - testület jogosult.","a":"HAMIS","t":"IF"},{"q":"A nyilvántartásba vétel első lépése az ügyirat érkezésének regisztrálása érkeztető számmal.","a":"IGAZ","t":"IF"},{"q":"A pénzpiacon az egy évnél hosszabb idejű pénzcserék zajlanak.","a":"HAMIS","t":"IF"},{"q":"A pótszabadság mértéke függ a kormánytisztviselő besorolási fokozatától.","a":"IGAZ","t":"IF"},{"q":"A reform felülről lefelé irányuló folyamat.","a":"IGAZ","t":"IF"},{"q":"A rendkívüli munkavégzés időtartama éves szinten","a":"200 óra","t":"MC"},{"q":"A rendőrök a Magyary Program személyzet fogalmának személyi hatálya alá tartoznak.","a":"IGAZ","t":"IF"},{"q":"A szabadságot legkésőbb a tárgyévet követő év március 31-ig kell kiadni.","a":"IGAZ","t":"IF"},{"q":"A személyes adatoknál nem lehet készletezve gyűjteni az adatokat.","a":"IGAZ","t":"IF"},{"q":"A szervezet belső szabályzata tartalmazza a működési rendjét és gazdasági működésének szabályait.","a":"IGAZ","t":"IF"},{"q":"A szignálást követően az iktatott iratokat nyomon követhető és hitelt érdemlő módon kell továbbítani.","a":"IGAZ","t":"IF"},{"q":"A Tanács soros elnöke Magyarország először 2011 első félévében volt.","a":"IGAZ","t":"IF"},{"q":"A tanácsi munka szakmai előkészítése a munkacsoportokban zajlik.","a":"IGAZ","t":"IF"},{"q":"A tárca nélküli miniszterek nem tartoznak a Kormány tagjai közé.","a":"HAMIS","t":"IF"},{"q":"A tartalékok a központi alrendszer kiadáscsoportjai közé tartoznak.","a":"IGAZ","t":"IF"},{"q":"A természetes személyre vonatkozó adatokból levont következtetés személyes adat.","a":"IGAZ","t":"IF"},{"q":"A törzskönyvi nyilvántartásba vételt a Magyar Államkincstár végzi.","a":"IGAZ","t":"IF"},{"q":"A végrehajtó hatalom élén a Kormány áll.","a":"IGAZ","t":"IF"},{"q":"A versenynek fontos szerepe van a közigazgatásban.","a":"HAMIS","t":"IF"},{"q":"A vezetés egy szervezeten belül az igazgatás igazgatása.","a":"IGAZ","t":"IF"},{"q":"A vizsgálat során a másodfokú hatóság kötve van a fellebbezésben foglaltakhoz.","a":"HAMIS","t":"IF"},{"q":"Az adatgyűjtés is adatkezelésnek minősül.","a":"IGAZ","t":"IF"},{"q":"Az alapeljárás a közigazgatási eljárás első szakasza, ezért első fokú eljárásnak is hívjuk.","a":"IGAZ","t":"IF"},{"q":"Az alapilletmény eltérítése: legfeljebb 20%-kal emelhető meg.","a":"HAMIS","t":"IF"},{"q":"Az alapvető jogok biztosa a vizsgálata alá vont hatóságokra nézve kötelező határozatot hozhat.","a":"HAMIS","t":"IF"},{"q":"Az alapvető jogok biztosa évente beszámol az Országgyűlésnek tevékenységéről.","a":"IGAZ","t":"IF"},{"q":"Az alkotmánybírák lehetnek politikai párt tagjai, csak nem folytathatnak politikai tevékenységet.","a":"HAMIS","t":"IF"},{"q":"Az Alkotmánybíróság általában nincs határidőhöz kötve.","a":"IGAZ","t":"IF"},{"q":"Az Alkotmánybíróság része a rendes bíróságok szervezetrendszerének.","a":"HAMIS","t":"IF"},{"q":"Az államfői tisztség megszűnik, ha az elnök a feladatkörét 60 napon túl nem tudja ellátni.","a":"HAMIS","t":"IF"},{"q":"Az államháztartás ellenőrzése külső és belső szintből áll.","a":"HAMIS","t":"IF"},{"q":"Az államháztartási kiadások esetében állami működési funkciót, jóléti funkciót, és gazdasági funkciókat tudunk megkülönböztetni.","a":"IGAZ","t":"IF"},{"q":"Az Amszterdami szerződés az EU-t jogi személlyé tette.","a":"HAMIS","t":"IF"},{"q":"Az egyablakos ügyintézés azt jelenti, hogy egy adott ügy bárhonnan elintézhető.","a":"HAMIS","t":"IF"},{"q":"Az elektronikus úton érkezett irat esetében a visszaigazolást követően 3 nap áll a hatóság rendelkezésére.","a":"IGAZ","t":"IF"},{"q":"Az etika erkölcsi parancsok kódexe.","a":"IGAZ","t":"IF"},{"q":"Az EU jogán belül nincs jogforrási hierarchia.","a":"HAMIS","t":"IF"},{"q":"Az Európai Parlament képviselői rendelkeznek mentelmi joggal.","a":"IGAZ","t":"IF"},{"q":"Az Európai Parlamentnek elhanyagolható szerepe van a rendes jogalkotásban.","a":"HAMIS","t":"IF"},{"q":"Az Európai Tanács főszabály szerint konszenzussal dönt.","a":"IGAZ","t":"IF"},{"q":"Az éves fizetett szabadság alapszabadságból és pótszabadságból áll.","a":"IGAZ","t":"IF"},{"q":"Az innováció jellemző eszközei az irányítási, jogi jellegű eszközök.","a":"HAMIS","t":"IF"},{"q":"Az irányítás közigazgatási jogviszony, azon belül anyagi jogviszony.","a":"IGAZ","t":"IF"},{"q":"Az írásbeli meghatalmazást közokiratba vagy teljes bizonyító erejű magánokiratba kell foglalni.","a":"IGAZ","t":"IF"},{"q":"Az iratok továbbítása történhet átadókönyvben.","a":"IGAZ","t":"IF"},{"q":"Az iratokról csak elektronikus másolatot lehet kiadni.","a":"HAMIS","t":"IF"},{"q":"Az OGY a benyújtott törvényjavaslatokról plenáris ülésen dönt.","a":"IGAZ","t":"IF"},{"q":"Az országos listára a magyar választási rendszerben közvetlenül lehet szavazni.","a":"HAMIS","t":"IF"},{"q":"Az országgyűlési képviselőket mentelmi jog illeti meg, amelynek két eleme a felelőtlenség és a sérthetetlenség.","a":"IGAZ","t":"IF"},{"q":"Az önkéntességen alapuló jogszerű adatkezelés feltétele az érintett tudatos beleegyezése.","a":"IGAZ","t":"IF"},{"q":"Az önkormányzat költségvetési koncepcióját a polgármester terjeszti a képviselő-testület elé.","a":"IGAZ","t":"IF"},{"q":"Az önkormányzati jogokat az Alaptörvény sorolja fel.","a":"IGAZ","t":"IF"},{"q":"Az önkormányzatok lehetnek települési és területi önkormányzatok.","a":"IGAZ","t":"IF"},{"q":"Az SzMSz-t az alapító okirat alapján kell elkészíteni.","a":"IGAZ","t":"IF"},{"q":"Az ügyészség nyomozást folytathat, és felügyeletet gyakorol a nyomozás felett.","a":"IGAZ","t":"IF"},{"q":"Az ügyfél a közigazgatási eljárásban csak személyesen járhat el.","a":"HAMIS","t":"IF"},{"q":"Az ügyfél köteles jóhiszeműen eljárni.","a":"IGAZ","t":"IF"},{"q":"Gondatlan károkozást a dolgozónak teljes mértékben kell megtéríteni.","a":"HAMIS","t":"IF"},{"q":"Hatósági döntés csak hivatalos iratként kézbesíthető.","a":"HAMIS","t":"IF"},{"q":"Jogi normát kizárólag az Országgyűlés alkothat.","a":"HAMIS","t":"IF"},{"q":"Kormányülés általában hetente egyszer van.","a":"IGAZ","t":"IF"},{"q":"Magyarországon alkotmányozó hatalommal az Országgyűlés van felruházva.","a":"IGAZ","t":"IF"},{"q":"Minden jogharmonizációs célt szolgáló magyar jogszabályt jogharmonizációs záradékkal kell ellátni.","a":"IGAZ","t":"IF"},{"q":"Miniszteri rendeletet hatáskörrel rendelkező miniszter írja alá.","a":"IGAZ","t":"IF"},{"q":"Személyes adatnak minősül a bármely természetes személlyel kapcsolatba hozható adat.","a":"IGAZ","t":"IF"},{"q":"Társadalombiztosítás = Nyugdíjbiztosítási Alap + Egészségbiztosítási Alap.","a":"IGAZ","t":"IF"},{"q":"Végrehajtási rendelet kiadásához külön felhatalmazás kell.","a":"IGAZ","t":"IF"},{"q":"A 2011-es népszámlálás alkalmával hány fő vallotta magát magyar nemzetiségűnek Szlovákiában?","a":"458 467","t":"MC"},{"q":"A döntés közlésétől számított mennyi időn belül lehet hivatalból felülvizsgálati eljárást indítani?","a":"1 éven belül","t":"MC"},{"q":"A fellebbezési eljárás során a fellebbezési kérelmet kinek kell benyújtani?","a":"Az elsőfokon eljárt hatósághoz","t":"MC"},{"q":"A felsoroltak közül melyik jellemző leginkább az Új Weberizmusra?","a":"A közigazgatásnak elsősorban állampolgár-barátnak kell lennie","t":"MC"},{"q":"A fővárosi és megyei kormányhivatalok integrált ügyfélszolgálatát minek nevezik?","a":"Kormányablak","t":"MC"},{"q":"A hatóság mikor vizsgálja az illetékességet az eljárás során?","a":"Az eljárás minden szakaszában","t":"MC"},{"q":"A helyi önkormányzatoknál dolgozó köztisztviselők mikor jogosultak illetménykiegészítésre?","a":"Ha a képviselő-testület rendeletben megállapít illetménykiegészítést","t":"MC"},{"q":"A jogalkalmazás során milyen ügyekben hoznak döntéseket a közhatalmi szervek?","a":"Egyedi ügyekben","t":"MC"},{"q":"A jogszabály mely hatálya mutatja meg, hogy az adott jogszabály mely személyekre vonatkozik?","a":"Személyi hatály","t":"MC"},{"q":"A KET szerint az ügyfeleket megilleti a ... eljáráshoz való jog.","a":"Tisztességes","t":"MC"},{"q":"A Kormány mely programja tűzte ki célul a közigazgatás hatékonyabbá tételét?","a":"A Magyary Program","t":"MC"},{"q":"A Kormány ülésein kik rendelkeznek szavazati joggal?","a":"A miniszterelnök és a miniszterek","t":"MC"},{"q":"A kormánytagok rendeletét hol kell kihirdetni?","a":"A Magyar Közlönyben","t":"MC"},{"q":"A kormánytisztviselő napi munkájának befejezése és a másnapi munkakezdés között legalább hány óra pihenőidőt kell biztosítani?","a":"11 óra","t":"MC"},{"q":"A költségvetési törvény ellenőrzése mivel történik?","a":"Zárszámadási törvénnyel","t":"MC"},{"q":"A költségvetési törvénynek meddig kell elkészülni?","a":"December 31-ig","t":"MC"},{"q":"A közigazgatási hatósági eljárás hivatalos nyelve főszabály szerint:","a":"Magyar","t":"MC"},{"q":"A közigazgatási jogalkalmazás során először milyen eljárás folytatódik le?","a":"Közigazgatási eljárás","t":"MC"},{"q":"A köztársasági elnök személye sérthetetlen, döntéseiért felelősséggel tartozik?","a":"Sem politikai, sem jogi felelősséggel nem tartozik","t":"MC"},{"q":"A közszektor szervezeteinek elsődleges célja milyen igények kielégítése?","a":"Kollektív igények","t":"MC"},{"q":"Adósságszolgálat kinek a kiadása?","a":"A központi alrendszer kiadása","t":"MC"},{"q":"Alapesetben mennyi a Bizalmas minősítési szintű adatok maximális érvényességi ideje?","a":"20 év","t":"MC"},{"q":"Alapesetben mennyi a Titkos minősítési szintű adatok maximális érvényességi ideje?","a":"30 év","t":"MC"},{"q":"Alpolgármestert kinek a javaslatára neveznek ki?","a":"A polgármester javaslatára","t":"MC"},{"q":"Amennyiben a köztisztviselő szándékosan okozott kárt, mekkora részét kell megtérítenie?","a":"A teljes kárt","t":"MC"},{"q":"Az alapilletmény eltérítésére polgármesteri hivatalban ki állapíthat meg személyi illetményt?","a":"A jegyző","t":"MC"},{"q":"Az alapilletményt mennyivel térítheti el lefelé a vezető?","a":"20%-kal","t":"MC"},{"q":"Az alapszabadság mekkora részét kell a köztisztviselő által kért időpontban kiadni?","a":"Kétötödét","t":"MC"},{"q":"Az egy ügyirathoz tartozó iratokat milyen számmal kell ellátni?","a":"Az iktatási főszám alatt folyamatosan kiadott alszámokon","t":"MC"},{"q":"Az eltérítés keretében legfeljebb mennyivel lehet emelni az alapilletményt?","a":"50%-kal","t":"MC"},{"q":"Az Európai Parlament tagjait hány évre választják?","a":"5 évre","t":"MC"},{"q":"Az Európai Unió melyik hivatalos nyelvei közül melyik NEM munkanyelv?","a":"Magyar","t":"MC"},{"q":"Az országgyűlés működési rendjét és a tárgyalás szabályait mi tartalmazza?","a":"A Házszabály","t":"MC"},{"q":"Az ügyészek számára ki adhat utasítást?","a":"A legfőbb ügyész és a felettes ügyész","t":"MC"},{"q":"Az ügyészségi hierarchiában ki van az élen?","a":"A legfőbb ügyész","t":"MC"},{"q":"COREPER hány szintje van?","a":"2 szintje van","t":"MC"},{"q":"Egészítse ki: A ... az igazgatás igazgatása.","a":"Vezetés","t":"MC"},{"q":"Egészítse ki: A ... problematikája – bizonyos uniós jogszabályok tagállami intézkedések nélkül hoznak létre jogokat.","a":"Közvetlen hatály","t":"MC"},{"q":"Egészítse ki: A közigazgatás ... végső soron állami kényszert jelent.","a":"Döntései","t":"MC"},{"q":"Egészítse ki: Az MNB elsődleges célja a ... elérése és fenntartása.","a":"Árstabilitás","t":"MC"},{"q":"Egészítse ki: Az önkormányzat ... autonómia keretében rendeleteket és határozatokat hozhat.","a":"Szabályozási","t":"MC"},{"q":"Egészítse ki: A Liszaboni Szerződés az Európai Parlamentet ... tette.","a":"Társjogalkotóvá","t":"MC"},{"q":"Egészítse ki: A ... az Európai Parlamentet társjogalkotóvá tette.","a":"Lisszaboni Szerződés","t":"MC"},{"q":"Egészítse ki: A hatóság a bizonyítékokat egyenként és összességükben értékelve állapítja meg a ...","a":"Tényállást","t":"MC"},{"q":"Egészítse ki: Az első fokú hatóság, ha döntése jogszabályt sért, azt ...","a":"Módosítja vagy visszavonja","t":"MC"},{"q":"Egészítse ki: Az MNB elsődleges célja az ... elérése és fenntartása.","a":"Árstabilitás","t":"MC"},{"q":"Egészítse ki: A kötelezettségvállalás a kötelezettség vállalásáról szóló szabályszerűen megtett ...","a":"Jognyilatkozat","t":"MC"},{"q":"Egészítse ki: A hazai fizetőeszköz gyengülése a belföldi gazdaság élénkülésének köszönhetően ... a munkanélküliséget.","a":"Csökkenti","t":"MC"},{"q":"Egészítse ki: A helyettes államtitkárt a miniszter javaslatára a ... nevezi ki.","a":"Miniszterelnök","t":"MC"},{"q":"Egészítse ki: A helyi önkormányzat ... szerv.","a":"Decentralizált","t":"MC"},{"q":"Egészítse ki: A képviselővel szemben tettenérés esetét kivéve csak a(z) ... előzetes hozzájárulásával indítható büntető eljárás.","a":"Országgyűlés","t":"MC"},{"q":"Egészítse ki: A Kormány testületi szerv, működésének főbb szabályait a(z) ... tartalmazza.","a":"Kormány ügyrendje","t":"MC"},{"q":"Egészítse ki: A közigazgatási eljárási törvény (Ket.) ... megmutatja, hogy a Ket.-et milyen ügyekben kell alkalmazni.","a":"Tárgyi hatálya","t":"MC"},{"q":"Egészítse ki: A törvényhozó hatalmi ágat a(z)..., az igazságszolgáltató hatalmi ágat a(z)... képviseli(k).","a":"Országgyűlés – rendes bíróságok","t":"MC"},{"q":"Egészítse ki: A végrehajtó hatalmi ág csúcsán a(z)... áll.","a":"Kormány","t":"MC"},{"q":"Egészítse ki: A(z) ... azt mondja ki, hogy a költségvetéssel kapcsolatos dokumentumoknak mindenki számára hozzáférhetőnek kell lenniük.","a":"Nyilvánosság elve","t":"MC"},{"q":"Egészítse ki: Az Alkotmánybíróság a(z)... védelmének legfőbb szerve.","a":"Alaptörvény","t":"MC"},{"q":"Egészítse ki: Az irat előzményét ... nevezzük.","a":"Előiratnak","t":"MC"},{"q":"Egészítse ki: Területi önkormányzatnak kizárólag a(z)... önkormányzatokat tekintjük.","a":"Megyei","t":"MC"},{"q":"Egészítse ki: A monetáris politika legfőbb irányítója a(z)...","a":"Központi bank","t":"MC"},{"q":"Egészítse ki: A törvényhozás a(z) ... fenntartott kizárólagos tevékenysége.","a":"Az Országgyűlésnek","t":"MC"},{"q":"EP-ben a képviselőválasztás milyen típusú?","a":"Arányos (listás)","t":"MC"},{"q":"Etikai vétséget elkövetőkkel szemben kiszabható büntetés?","a":"Figyelmeztetés és megrovás","t":"MC"},{"q":"Főszabály szerint mennyi a heti munkaidő?","a":"40 óra","t":"MC"},{"q":"Hány alelnöke van az Európai Parlamentnek?","a":"14","t":"MC"},{"q":"Hány besorolási osztály van a Kttv.-ben?","a":"3 (három)","t":"MC"},{"q":"Hány évre szól az Európai Bizottság tagjainak megbízatása?","a":"5 évre","t":"MC"},{"q":"Hány évre választják az Alkotmánybíróság tagjait?","a":"12 évre","t":"MC"},{"q":"Hány évre választják az Európai Parlament tisztségviselőit?","a":"2,5 évre","t":"MC"},{"q":"Hány főtanácsnok működik az Európai Unió Bírósága mellett?","a":"11","t":"MC"},{"q":"Hány hivatalos nyelve van az EU-nak jelenleg?","a":"24","t":"MC"},{"q":"Hány nap a köztisztviselők alapszabadsága évente?","a":"25 nap","t":"MC"},{"q":"Hány nap áll rendelkezésre ügyészi fellépésre?","a":"30 nap","t":"MC"},{"q":"Hány szintű Magyarországon a rendes bíróságok rendszere?","a":"4 szintű","t":"MC"},{"q":"Hány tagja van az Alkotmánybíróságnak?","a":"15","t":"MC"},{"q":"Hányadik életév betöltésekor szűnik meg a közszolgálati jogviszony?","a":"70. életévkor","t":"MC"},{"q":"Hányszor lehet újraválasztani a köztársasági elnököt?","a":"Egyszer","t":"MC"},{"q":"Hogy hívják más néven a jogalkalmazás címzettjét?","a":"Jogalany","t":"MC"},{"q":"Hogy nevezzük a köztisztviselőket és a kormánytisztviselőket munkájukért megillető havi díjazást?","a":"Illetmény","t":"MC"},{"q":"Hogy nevezzük másként a közjogi jogviszonyból származó bevételeket?","a":"Közhatalmi jellegű bevételek","t":"MC"},{"q":"Hogyan érvényesítheti a munkáltató a Kttv.-ből származó igényét?","a":"Csak bírósági úton","t":"MC"},{"q":"Hogyan hat a hazai fizetőeszköz erősödése a beruházásokra?","a":"Visszafogja","t":"MC"},{"q":"Hogyan módosíthatók az elsődleges jog forrásai az EU-ban?","a":"Az érintett tagállamok konszenzusával","t":"MC"},{"q":"Hogyan nevezik a Tanácsot informálisan?","a":"Miniszterek Tanácsa","t":"MC"},{"q":"Hogyan nevezzük, amikor országunk hadiállapotban áll vagy idegen hatalom fegyveres támadása fenyeget?","a":"Rendkívüli állapot","t":"MC"},{"q":"Hol található az Európai Központi Bank székhelye?","a":"Frankfurt am Main","t":"MC"},{"q":"Hol van az Európai Unió Bíróságának székhelye?","a":"Luxemburgban","t":"MC"},{"q":"Jelölje meg az információs önrendelkezési jogról szóló törvényt!","a":"2011. évi CXII. törvény","t":"MC"},{"q":"Ki a képviselő-testület elnöke?","a":"A polgármester","t":"MC"},{"q":"Ki a kormányhivatalban a főigazgató helyettese?","a":"Az igazgató","t":"MC"},{"q":"Ki adta ki a Köztisztviselők Etikai Kódexét?","a":"Az Európa Tanács","t":"MC"},{"q":"Ki bírálja el az újrafelvételi eljárást első fokon?","a":"Az eljáró hatóság","t":"MC"},{"q":"Ki csatlakozott 10.-ként az EU-hoz?","a":"Görögország","t":"MC"},{"q":"Ki ellenőrzi az államháztartás forrásainak rendeltetésszerű használatát?","a":"Az Állami Számvevőszék","t":"MC"},{"q":"Ki felelős az önkormányzati költségvetési koncepció elkészítéséért?","a":"A jegyző","t":"MC"},{"q":"Ki fogadja el a helyi önkormányzat költségvetési rendeletét?","a":"A képviselő-testület","t":"MC"},{"q":"Ki foszthatja meg a köztársasági elnököt tisztségétől?","a":"Az Alkotmánybíróság","t":"MC"},{"q":"Ki gyakorolja a munkáltatói jogokat a minisztérium kormánytisztviselői felett?","a":"A közigazgatási államtitkár","t":"MC"},{"q":"Ki hirdeti ki a rendkívüli állapotot?","a":"Az Országgyűlés","t":"MC"},{"q":"Ki javasolja a miniszterelnököt?","a":"A köztársasági elnök","t":"MC"},{"q":"Ki képviseli Magyarországot az Európai Tanácsban?","a":"A miniszterelnök","t":"MC"},{"q":"Ki nevezi ki a fővárosi és megyei kormányhivatalok főigazgatóját?","a":"A miniszterelnök","t":"MC"},{"q":"Ki nevezi ki a helyettes államtitkárt?","a":"A miniszterelnök","t":"MC"},{"q":"Ki nevezi ki a hivatásos bírákat?","a":"A köztársasági elnök","t":"MC"},{"q":"Ki nevezi ki az államtitkárokat?","a":"A köztársasági elnök","t":"MC"},{"q":"Ki nevezi ki az ügyészeket?","a":"A legfőbb ügyész","t":"MC"},{"q":"Ki nyújthat be konstruktív bizalmatlansági indítványt?","a":"Az országgyűlési képviselők egyötöde","t":"MC"},{"q":"Ki választja az Alkotmánybíróság tagjait?","a":"Az Országgyűlés","t":"MC"},{"q":"Ki választja meg a legfőbb ügyészt?","a":"Az Országgyűlés","t":"MC"},{"q":"Ki vonhatja felelősségre a köztársasági elnököt?","a":"Az Alkotmánybíróság","t":"MC"},{"q":"Kinek a hatáskörébe tartozik a közkegyelem gyakorlása?","a":"Az Országgyűlés hatáskörébe","t":"MC"},{"q":"Kinek a megbízatása nem szűnik meg a Kormány megbízatásának megszűnésével?","a":"A közigazgatási államtitkáré","t":"MC"},{"q":"Kinek tartozik beszámolási kötelezettséggel az MNB elnöke?","a":"Az Országgyűlésnek","t":"MC"},{"q":"Kormányhivatalt ki vezeti?","a":"A főigazgató","t":"MC"},{"q":"Kormánytisztviselőknél mennyi lehet a rendkívüli munkavégzés éves szinten?","a":"200 óra","t":"MC"},{"q":"Legfeljebb mennyi időre lehet a szigorúan titkos adatot minősíteni?","a":"30 évre","t":"MC"},{"q":"Legmagasabb besorolási fokozat a köztisztviselőknél?","a":"Vezető-főtanácsos","t":"MC"},{"q":"Lisszaboni Szerződés aláírásának éve?","a":"2007","t":"MC"},{"q":"Mely jogforrás helyezkedik el a jogforrási hierarchia csúcsán?","a":"Az Alaptörvény","t":"MC"},{"q":"Mely köztisztviselők tartoznak az I. besorolási osztályba?","a":"Felsőfokú iskolai végzettségűek","t":"MC"},{"q":"Mely országok csatlakoztak az európai integrációs szervezethez 1986-ban?","a":"Portugália és Spanyolország","t":"MC"},{"q":"Mely stratégiai célkitűzések tartoznak a Magyary Program Eljárás pilléréhez?","a":"Az ügyfélkapcsolatok javítása és a belső eljárások racionalizálása","t":"MC"},{"q":"Melyik a Magyary Program hatékonyság-fogalmának összetevője, ahol a feladatvégrehajtás követhető és számon kérhető?","a":"Felügyelhető","t":"MC"},{"q":"Melyik a központi alrendszer legjelentősebb bevétele?","a":"Az adójellegű bevételek","t":"MC"},{"q":"Melyik az a jogforrás, amelynek kiadására 1989 óta nem került sor, de néhány száz még hatályban van?","a":"Törvényerejű rendelet","t":"MC"},{"q":"Melyik elem nem tartozik a Magyary Program hatékonyság-fogalmának összetevői közé?","a":"Takarékos","t":"MC"},{"q":"Melyik évben lépett életbe a Lisszaboni Szerződés?","a":"2009-ben","t":"MC"},{"q":"Melyik évben vált az EU jogi személlyé?","a":"2009-ben","t":"MC"},{"q":"Melyik fegyelmi büntetés jár a közszolgálati jogviszony megszűnésével?","a":"Hivatalvesztés","t":"MC"},{"q":"Melyik hatalmi ághoz tartozik a közigazgatási jogalkalmazás?","a":"A végrehajtó hatalomhoz","t":"MC"},{"q":"Melyik hatóság jogosult az újrafelvételi eljárás lefolytatására?","a":"Az első fokon eljáró hatóság","t":"MC"},{"q":"Melyik jellemző nem illik a dekoncentrált szervekre?","a":"Főszabály szerint általános hatáskörrel rendelkeznek","t":"MC"},{"q":"Melyik jogszabály szabályozza a közigazgatási hatósági eljárás általános kérdéseit?","a":"2004. évi CXL. törvény","t":"MC"},{"q":"Melyik közigazgatás-fejlesztési irányzat érvelt az eredményalapú szemlélet elterjesztése mellett?","a":"Új Weberizmus","t":"MC"},{"q":"Melyik közigazgatási változástípus intézményesülési sémája: tervezés – előzetes értékelés – bevezetés?","a":"Reform","t":"MC"},{"q":"Melyik nem a közigazgatási hatósági eljárás szakasza?","a":"Fellebbviteli eljárás","t":"MC"},{"q":"Melyik nem a közigazgatási hatósági tevékenység egyik fajtája?","a":"Végrehajtási tevékenység","t":"MC"},{"q":"Melyik nem a Magyary Program pillére?","a":"Működése","t":"MC"},{"q":"Melyik nem alapvető kötelezettség az Alaptörvény alapján?","a":"Feljelentési kötelezettség bűncselekmény esetén","t":"MC"},{"q":"Melyik nem autonóm központi államigazgatási szerv?","a":"A Nemzeti Adó- és Vámhivatal","t":"MC"},{"q":"Melyik nem az állam által átengedett központi adó?","a":"Általános forgalmi adó","t":"MC"},{"q":"Melyik nem saját önkormányzati bevétel?","a":"Normatív állami támogatások","t":"MC"},{"q":"Melyik nem tartozik a kötelezettségvállalás vertikális munkaszakaszaiba?","a":"Kiadmányozás","t":"MC"},{"q":"Melyik nem települési önkormányzat?","a":"A megyei önkormányzat","t":"MC"},{"q":"Melyik ország nem az Európai Szén és Acélközösség alapító tagja?","a":"Nagy-Britannia","t":"MC"},{"q":"Melyik szerv látja el az államháztartás külső ellenőrzésével kapcsolatos feladatokat?","a":"Az Állami Számvevőszék","t":"MC"},{"q":"Melyik szervezetre igaz: Az Országgyűlés pénzügyi-gazdasági ellenőrző szerve.","a":"Az Állami Számvevőszék","t":"MC"},{"q":"Melyik szerződés szüntette meg az EU pillérrendszerét?","a":"A Lisszaboni Szerződés","t":"MC"},{"q":"Melyik tanácsi formáció rövidítése az ENVI?","a":"Környezetvédelmi Tanács","t":"MC"},{"q":"Melyik tartozik a II. besorolási osztályba?","a":"Gyakornok, előadó, főelőadó, főmunkatárs","t":"MC"},{"q":"Melyik törvény rendelkezik az államháztartásról?","a":"2011. évi CXCV. törvény","t":"MC"},{"q":"Melyik választási rendszert alkalmazzák jelenleg Magyarországon?","a":"Vegyes választási rendszert","t":"MC"},{"q":"Mennyi a felmentési idő?","a":"2 hónap","t":"MC"},{"q":"Mennyi a próbaidő?","a":"3–6 hónap","t":"MC"},{"q":"Mennyi az általános eljárási határidő?","a":"30 nap","t":"MC"},{"q":"Mi a Magyar Nemzeti Bank elsődleges feladata?","a":"Az árstabilitás elérése és fenntartása","t":"MC"},{"q":"Mi a polgármesteri hivatal?","a":"A képviselő-testület hivatala","t":"MC"},{"q":"Mi az államháztartás legnagyobb bevétele?","a":"Adó","t":"MC"},{"q":"Mi jelent a GDP rövidítés magyarul?","a":"Bruttó hazai termék","t":"MC"},{"q":"Mi nem minősül különleges adatnak?","a":"Vagyoni helyzet","t":"MC"},{"q":"Mikor alakult az Európai Gazdasági Közösség és hol?","a":"1957-ben, Rómában","t":"MC"},{"q":"Mikor csatlakozott Magyarország az EU-hoz?","a":"2004. május 1-jén","t":"MC"},{"q":"Mikor határozatképes a képviselő-testület?","a":"Ha az ülésen a képviselők több mint fele jelen van","t":"MC"},{"q":"Mikor kap végkielégítést egy kormánytisztviselő?","a":"Felmentés és a közigazgatási szerv jogutód nélküli megszüntetése esetén","t":"MC"},{"q":"Mikor lépett hatályba az Alaptörvény?","a":"2012. január 1-jén","t":"MC"},{"q":"Mikor lépett érvénybe a Ket.?","a":"2005. november 1-jén","t":"MC"},{"q":"Mikor született a Schuman-nyilatkozat?","a":"1950. május 9-én","t":"MC"},{"q":"Mikor volt az első EU-bővítés?","a":"1972-ben","t":"MC"},{"q":"Mikor volt Magyarország az EU soros elnöke?","a":"2011 első félévében","t":"MC"},{"q":"Milyen adatot nem tartalmaz a személyi adat- és lakcímnyilvántartás?","a":"Adószám","t":"MC"},{"q":"Milyen formában terjeszthető elő adatigénylés a közfeladatot ellátó szerveknél?","a":"Bármilyen formában","t":"MC"},{"q":"Milyen összegig téríti meg az OBA a betétesek kárát?","a":"100 ezer euróig","t":"MC"},{"q":"Milyen típusú szerv a Gazdasági Versenyhivatal?","a":"Autonóm","t":"MC"},{"q":"Milyen választójog van Magyarországon?","a":"Általános, egyenlő, közvetlen és titkos","t":"MC"},{"q":"Minden közérdekű adat nyilvános?","a":"Nem minden","t":"MC"},{"q":"Mit jelent a nyílt kormányzás elve?","a":"Transzparens állami működés biztosítása","t":"MC"},{"q":"Mit jelent az expediálás?","a":"Az iratok továbbítása","t":"MC"},{"q":"Mit kell tenni, ha a köztisztviselő hivatalára méltatlanná válik?","a":"Fel kell menteni","t":"MC"},{"q":"Mit nevezünk nemzeti vagyonnak?","a":"Az állam és a helyi önkormányzat tulajdonát","t":"MC"},{"q":"Mit takar az ún. III. pillér az EU korábbi rendszerében?","a":"A Bel- és Igazságügyi Együttműködést","t":"MC"},{"q":"Törvényerejű rendeletet mivel lehet módosítani?","a":"Törvénnyel","t":"MC"}];

const QUIZ_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Közigazgatási Alapvizsga – Gyakorló Teszt</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:#faf6ef;color:#1e1c18;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:0 14px 60px}
header{width:100%;max-width:700px;text-align:center;padding:36px 0 22px;border-bottom:2px solid #c8941a;margin-bottom:28px}
header h1{font-size:clamp(18px,4vw,26px);color:#1a2744;line-height:1.3;margin-bottom:4px}
header p{color:#7a7060;font-size:13px}
.screen{display:none;width:100%;max-width:700px}.screen.active{display:block}
.card{background:#fff;border:1px solid #d8cdb8;border-radius:12px;padding:28px 32px;margin-bottom:16px;box-shadow:0 1px 10px rgba(0,0,0,.06)}
h2{font-size:19px;color:#1a2744;margin-bottom:12px}
p{font-size:15px;line-height:1.7;color:#3a3530;margin-bottom:8px}
.stats{display:flex;gap:12px;margin:12px 0;flex-wrap:wrap}
.stat{background:#f0ead8;border-radius:8px;padding:10px 14px;flex:1;min-width:110px;text-align:center}
.stat-n{font-size:24px;font-weight:700;color:#1a2744}.stat-l{font-size:11px;color:#7a7060;margin-top:1px}
.row{display:flex;align-items:center;gap:10px;margin:12px 0 4px;flex-wrap:wrap}
.row label{font-size:14px;color:#1a2744;font-weight:600}
select{font-family:Georgia,serif;font-size:14px;padding:8px 12px;border:2px solid #d8cdb8;border-radius:8px;background:#faf6ef;color:#1e1c18;cursor:pointer;outline:none}
select:focus{border-color:#c8941a}
.btn-main{display:block;width:100%;padding:13px;font-family:Georgia,serif;font-size:16px;font-weight:700;background:#1a2744;color:#fff;border:none;border-radius:10px;cursor:pointer;margin-top:8px;transition:all .2s}
.btn-main:hover{background:#263660;transform:translateY(-1px)}
.btn-sec{background:transparent;color:#1a2744;border:2px solid #1a2744;font-size:13px;padding:9px 20px;border-radius:10px;font-family:Georgia,serif;cursor:pointer;transition:all .2s}
.btn-sec:hover{background:#1a2744;color:#fff}
.qprog-wrap{margin-bottom:14px}
.qprog-info{display:flex;justify-content:space-between;font-size:12px;color:#7a7060;margin-bottom:5px}
.qprog-track{height:5px;background:#f0ead8;border-radius:99px;overflow:hidden}
.qprog-fill{height:100%;background:linear-gradient(90deg,#1a2744,#c8941a);border-radius:99px;transition:width .35s}
.q-card{background:#fff;border:1px solid #d8cdb8;border-radius:14px;padding:28px 32px;box-shadow:0 2px 14px rgba(0,0,0,.07);margin-bottom:14px;animation:si .28s ease}
@keyframes si{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.q-badge{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#c8941a;margin-bottom:10px}
.q-text{font-size:clamp(15px,2.3vw,18px);line-height:1.72;margin-bottom:20px}
.opts{display:flex;flex-direction:column;gap:8px}
.opt{background:#faf6ef;border:2px solid #d8cdb8;border-radius:10px;padding:12px 16px;font-family:Georgia,serif;font-size:15px;color:#1e1c18;text-align:left;cursor:pointer;transition:all .15s;line-height:1.5;display:flex;align-items:flex-start;gap:10px}
.opt-l{min-width:20px;font-weight:700;color:#7a7060;font-size:12px;padding-top:2px;flex-shrink:0}
.opt:hover:not(:disabled){border-color:#1a2744;background:#eeeaf5;transform:translateX(2px)}
.opt.correct{background:#e8f5ee;border-color:#2d6a4f;color:#1d4a33}.opt.correct .opt-l{color:#2d6a4f}
.opt.wrong{background:#faeae7;border-color:#8b2010;color:#6b1a0d}.opt.wrong .opt-l{color:#8b2010}
.opt.reveal{background:#e8f5ee;border-color:#2d6a4f;color:#1d4a33}.opt.reveal .opt-l{color:#2d6a4f}
.opt:disabled{cursor:default}
.fb{border-radius:10px;padding:12px 16px;margin-top:10px;font-size:14px;line-height:1.6;display:none;animation:fi .2s ease}
@keyframes fi{from{opacity:0}to{opacity:1}}
.fb.ok{background:#e8f5ee;border-left:4px solid #2d6a4f;color:#1d4a33}
.fb.err{background:#faeae7;border-left:4px solid #8b2010;color:#6b1a0d}
#next-btn{display:none;width:100%;margin-top:2px}
#score-screen{text-align:center}
.sc{background:#fff;border:1px solid #d8cdb8;border-radius:16px;padding:42px 32px 36px;box-shadow:0 4px 22px rgba(0,0,0,.08);margin-bottom:18px}
.sc-e{font-size:52px;margin-bottom:12px}.sc-t{font-size:22px;color:#1a2744;margin-bottom:6px;font-weight:700}
.sc-s{color:#7a7060;font-size:14px;margin-bottom:22px}.sc-n{font-size:60px;font-weight:700;color:#1a2744;line-height:1;margin-bottom:4px}
.sc-d{font-size:15px;color:#7a7060;margin-bottom:22px}
.sc-bt{height:10px;background:#f0ead8;border-radius:99px;overflow:hidden;max-width:240px;margin:0 auto 20px}
.sc-bf{height:100%;border-radius:99px;transition:width 1s ease .3s}
.sc-g{display:inline-block;padding:7px 22px;border-radius:30px;font-size:15px;font-weight:600;margin-bottom:4px}
.btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:4px}
@media(max-width:480px){.q-card,.card{padding:18px 16px}.sc{padding:28px 16px}.stats{flex-direction:column}}
</style>
</head>
<body>
<header>
  <h1>Közigazgatási Alapvizsga<br>Gyakorló Teszt</h1>
  <p>KÉRDÉSSZÁM kérdés – a helyes és 3 generált rossz válasz közül kell választani</p>
</header>
<div id="start-screen" class="screen active">
  <div class="card">
    <h2>Üdvözöljük!</h2>
    <p>Minden kérdésnél 4 lehetőség közül kell kiválasztani a helyeset. Igaz/Hamis kérdéseknél 2 közül. Kattintás után azonnal látható, hogy helyes volt-e a válasz.</p>
    <div class="stats">
      <div class="stat"><div class="stat-n">KÉRDÉSSZÁM</div><div class="stat-l">Összes kérdés</div></div>
      <div class="stat"><div class="stat-n">IFSZAM</div><div class="stat-l">Igaz / Hamis</div></div>
      <div class="stat"><div class="stat-n">MCSZAM</div><div class="stat-l">Feleletválasztós</div></div>
    </div>
    <div class="row"><label>Kérdések száma:</label>
      <select id="q-count">
        <option value="10">10 kérdés</option>
        <option value="20" selected>20 kérdés</option>
        <option value="30">30 kérdés</option>
        <option value="50">50 kérdés</option>
        <option value="100">100 kérdés</option>
        <option value="9999">Összes (KÉRDÉSSZÁM)</option>
      </select>
    </div>
    <div class="row"><label>Típus:</label>
      <select id="q-type">
        <option value="all">Minden típus</option>
        <option value="IF">Csak Igaz / Hamis</option>
        <option value="MC">Csak feleletválasztós</option>
      </select>
    </div>
  </div>
  <button class="btn-main" onclick="startQuiz()">▶ Teszt indítása</button>
</div>
<div id="quiz-screen" class="screen">
  <div class="qprog-wrap">
    <div class="qprog-info"><span id="q-num">1. kérdés</span><span id="q-live">✓ 0</span></div>
    <div class="qprog-track"><div class="qprog-fill" id="qprog-fill" style="width:0%"></div></div>
  </div>
  <div class="q-card">
    <div class="q-badge" id="q-badge"></div>
    <div class="q-text" id="q-text"></div>
    <div class="opts" id="opts"></div>
    <div class="fb" id="fb"></div>
  </div>
  <button class="btn-main" id="next-btn" onclick="nextQ()">Következő →</button>
</div>
<div id="score-screen" class="screen">
  <div class="sc">
    <div class="sc-e" id="sc-e"></div><div class="sc-t" id="sc-t"></div>
    <div class="sc-s" id="sc-s"></div><div class="sc-n" id="sc-n"></div>
    <div class="sc-d" id="sc-d"></div>
    <div class="sc-bt"><div class="sc-bf" id="sc-bf" style="width:0%"></div></div>
    <div class="sc-g" id="sc-g"></div>
  </div>
  <div class="btn-row">
    <button class="btn-main" onclick="showScreen('start-screen')" style="max-width:260px">↺ Újra / Beállítások</button>
  </div>
</div>
<script>
const ALL_QS=ADATOK_PLACEHOLDER;
const L=['A','B','C','D'];
let qs=[],cur=0,ok=0,ans=false;
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active')}
function startQuiz(){
  const cnt=parseInt(document.getElementById('q-count').value);
  const typ=document.getElementById('q-type').value;
  let pool=typ==='IF'?ALL_QS.filter(q=>q.t==='IF'):typ==='MC'?ALL_QS.filter(q=>q.t==='MC'):[...ALL_QS];
  shuffle(pool);qs=pool.slice(0,Math.min(cnt,pool.length));cur=0;ok=0;
  showScreen('quiz-screen');render();
}
function render(){
  ans=false;const q=qs[cur],tot=qs.length;
  document.getElementById('q-num').textContent=(cur+1)+'. / '+tot;
  document.getElementById('q-live').textContent='✓ '+ok;
  document.getElementById('qprog-fill').style.width=((cur/tot)*100)+'%';
  document.getElementById('q-badge').textContent=q.t==='IF'?'Igaz / Hamis':'Feleletválasztós';
  document.getElementById('q-text').textContent=q.q;
  document.getElementById('fb').style.display='none';document.getElementById('fb').className='fb';
  document.getElementById('next-btn').style.display='none';document.getElementById('opts').innerHTML='';
  const opts=q.t==='IF'?['IGAZ','HAMIS']:[q.a,...(q.w||[])];
  if(q.t!=='IF')shuffle(opts);
  opts.forEach((v,i)=>{
    const b=document.createElement('button');b.className='opt';
    b.innerHTML='<span class="opt-l">'+L[i]+'</span><span>'+v+'</span>';
    b.dataset.v=v;b.onclick=()=>check(b,q);
    document.getElementById('opts').appendChild(b);
  });
}
function check(clicked,q){
  if(ans)return;ans=true;
  const sel=clicked.dataset.v;
  const c=q.t==='IF'?sel.toUpperCase()===q.a.toUpperCase():sel.trim()===q.a.trim();
  if(c)ok++;
  document.querySelectorAll('.opt').forEach(b=>b.disabled=true);
  if(c){clicked.classList.add('correct')}
  else{clicked.classList.add('wrong');document.querySelectorAll('.opt').forEach(b=>{const m=q.t==='IF'?b.dataset.v.toUpperCase()===q.a.toUpperCase():b.dataset.v.trim()===q.a.trim();if(m)b.classList.add('reveal');})}
  const fb=document.getElementById('fb');fb.style.display='block';
  fb.className=c?'fb ok':'fb err';
  fb.innerHTML=c?'✅ <strong>Helyes!</strong>':'❌ <strong>Helytelen.</strong> A helyes válasz: <strong>'+q.a+'</strong>';
  setTimeout(()=>document.getElementById('next-btn').style.display='block',300);
}
function nextQ(){cur++;if(cur>=qs.length)showScore();else render();}
function showScore(){
  showScreen('score-screen');
  const pct=Math.round((ok/qs.length)*100);
  const i=pct<40?0:pct<55?1:pct<70?2:pct<85?3:4;
  const D=[{e:'😢',t:'Sajnos nem sikerült',s:'Ne adja fel!',c:'#c0392b',g:'Elégtelen (1)'},{e:'😕',t:'Még gyakorolni kell',s:'Egy kis ismétlés segít.',c:'#e67e22',g:'Elégséges (2)'},{e:'🙂',t:'Jó kezdet!',s:'Haladás érezhető!',c:'#2980b9',g:'Közepes (3)'},{e:'😊',t:'Szép eredmény!',s:'Nagyon jól teljesített!',c:'#27ae60',g:'Jó (4)'},{e:'🎉',t:'Kitűnő!',s:'Gratulálunk!',c:'#1a2744',g:'Jeles (5)'}];
  const d=D[i];
  ['sc-e','sc-t','sc-s','sc-n','sc-d'].forEach((id,j)=>document.getElementById(id).textContent=[d.e,d.t,d.s,ok,'/ '+qs.length+' helyes ('+pct+'%)'][j]);
  const f=document.getElementById('sc-bf');f.style.background=d.c;setTimeout(()=>f.style.width=pct+'%',60);
  const g=document.getElementById('sc-g');g.textContent=d.g;g.style.cssText='background:'+d.c+'22;color:'+d.c+';border:2px solid '+d.c+'44';
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
</script>
</body>
</html>`;

const BATCH_SIZE = 15;

export default function App() {
  const [phase, setPhase] = useState("start"); // start | generating | done | error
  const [progress, setProgress] = useState({ done: 0, total: 0, msg: "" });
  const [downloadUrl, setDownloadUrl] = useState(null);
  const questionsRef = useRef(JSON.parse(JSON.stringify(RAW_QUESTIONS)));

  const mcQuestions = RAW_QUESTIONS.filter(q => q.t === "MC");
  const ifQuestions = RAW_QUESTIONS.filter(q => q.t === "IF");

  async function callAPI(batch) {
    const lines = batch.map((q, i) =>
      `${i + 1}. Kérdés: ${q.q.slice(0, 200)}\n   Helyes válasz: ${q.a}`
    ).join("\n\n");

    const prompt = `Magyar közigazgatási alapvizsga kérdésekhez generálj 3 HELYTELEN válaszlehetőséget minden kérdéshez.

Szabályok:
- Minden helytelen válasz az adott kérdés témájához illő, de egyértelműen téves legyen
- Hasonló stílus és hossz mint a helyes válasz (pl. ha a helyes válasz egy szám, a tévesek is számok legyenek)
- Ne ismételd a helyes választ más szavakkal

Válaszolj KIZÁRÓLAG JSON tömbben, semmi más szöveg:
[{"id":1,"w":["téves1","téves2","téves3"]},{"id":2,"w":["téves1","téves2","téves3"]},...]

Kérdések:
${lines}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Nem sikerült értelmezni a választ");
    return JSON.parse(match[0]);
  }

  async function generate() {
    setPhase("generating");
    const allQs = questionsRef.current;
    const mcQs = allQs.filter(q => q.t === "MC");
    const total = mcQs.length;
    let done = 0;

    setProgress({ done: 0, total, msg: "Indítás…" });

    const batches = [];
    for (let i = 0; i < mcQs.length; i += BATCH_SIZE) {
      batches.push(mcQs.slice(i, i + BATCH_SIZE));
    }

    const PARALLEL = 3;
    for (let i = 0; i < batches.length; i += PARALLEL) {
      const chunk = batches.slice(i, i + PARALLEL);
      setProgress(p => ({ ...p, msg: `${i + 1}–${Math.min(i + PARALLEL, batches.length)}. köteg / ${batches.length}` }));

      try {
        await Promise.all(chunk.map(async (batch) => {
          const results = await callAPI(batch);
          results.forEach(item => {
            const idx = item.id - 1;
            if (idx >= 0 && idx < batch.length && item.w && item.w.length >= 3) {
              batch[idx].w = item.w.slice(0, 3);
            }
          });
          done += batch.length;
          setProgress(p => ({ ...p, done }));
        }));
      } catch (e) {
        setPhase("error");
        setProgress(p => ({ ...p, msg: "Hiba: " + e.message }));
        return;
      }
    }

    // Build final HTML
    const finalQs = allQs.map(q => {
      if (q.t === "IF") return { q: q.q, a: q.a, t: "IF" };
      return { q: q.q, a: q.a, t: "MC", w: q.w || [] };
    });

    const ifCount = finalQs.filter(q => q.t === "IF").length;
    const mcCount = finalQs.filter(q => q.t === "MC").length;
    const total2 = finalQs.length;

    const html = QUIZ_HTML_TEMPLATE
      .replace(/KÉRDÉSSZÁM/g, total2)
      .replace(/IFSZAM/g, ifCount)
      .replace(/MCSZAM/g, mcCount)
      .replace("ADATOK_PLACEHOLDER", JSON.stringify(finalQs));

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    setDownloadUrl(URL.createObjectURL(blob));
    setPhase("done");
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#faf6ef", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 60px" }}>
      <div style={{ width: "100%", maxWidth: 680, textAlign: "center", padding: "36px 0 24px", borderBottom: "2px solid #c8941a", marginBottom: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚖️</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(18px,4vw,26px)", color: "#1a2744", lineHeight: 1.3, marginBottom: 4 }}>
          Közigazgatási Alapvizsga<br />Teszt Generátor
        </h1>
        <p style={{ color: "#7a7060", fontSize: 13 }}>Generáld le a kész tesztet, majd töltsd fel GitHubra</p>
      </div>

      <div style={{ width: "100%", maxWidth: 680 }}>
        {phase === "start" && (
          <div style={{ background: "#fff", border: "1px solid #d8cdb8", borderRadius: 12, padding: "28px 32px", marginBottom: 16, boxShadow: "0 1px 10px rgba(0,0,0,.06)" }}>
            <h2 style={{ fontSize: 19, color: "#1a2744", marginBottom: 12 }}>Hogyan működik?</h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#3a3530", marginBottom: 10 }}>
              A gombra kattintva a Claude AI minden kérdéshez kitalál 3 odaillő, de helytelen választ. Ez pár percet vesz igénybe.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#3a3530", marginBottom: 16 }}>
              Amikor kész, le lehet tölteni egy teljesen önálló HTML fájlt, amit fel lehet tölteni GitHubra (pl. GitHub Pages-re) és bármilyen böngészőből megnyitható telepítés nélkül.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { n: RAW_QUESTIONS.length, l: "Összes kérdés" },
                { n: ifQuestions.length, l: "Igaz / Hamis" },
                { n: mcQuestions.length, l: "Feleletválasztós" }
              ].map(({ n, l }) => (
                <div key={l} style={{ background: "#f0ead8", borderRadius: 8, padding: "10px 14px", flex: 1, minWidth: 110, textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1a2744" }}>{n}</div>
                  <div style={{ fontSize: 11, color: "#7a7060", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <button
              onClick={generate}
              style={{ display: "block", width: "100%", padding: 13, fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, background: "#1a2744", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", marginTop: 20 }}
            >
              ▶ Generálás indítása
            </button>
          </div>
        )}

        {phase === "generating" && (
          <div style={{ background: "#fff", border: "1px solid #d8cdb8", borderRadius: 12, padding: "28px 32px", boxShadow: "0 1px 10px rgba(0,0,0,.06)" }}>
            <h2 style={{ fontSize: 19, color: "#1a2744", marginBottom: 12 }}>Válaszlehetőségek generálása…</h2>
            <p style={{ fontSize: 15, color: "#3a3530", marginBottom: 20 }}>
              A Claude most találja ki a helytelen válaszokat minden kérdéshez. Ne zárd be az oldalt!
            </p>
            <div style={{ height: 10, background: "#f0ead8", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#1a2744,#c8941a)", borderRadius: 99, width: pct + "%", transition: "width .3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#7a7060", marginBottom: 8 }}>
              <span>{progress.done} / {progress.total} kész</span>
              <span>{pct}%</span>
            </div>
            <p style={{ fontSize: 13, color: "#7a7060" }}>{progress.msg}</p>
          </div>
        )}

        {phase === "error" && (
          <div style={{ background: "#faeae7", border: "1px solid #8b2010", borderRadius: 12, padding: "28px 32px" }}>
            <h2 style={{ fontSize: 19, color: "#8b2010", marginBottom: 12 }}>Hiba történt</h2>
            <p style={{ fontSize: 15, color: "#6b1a0d", marginBottom: 16 }}>{progress.msg}</p>
            <button onClick={() => setPhase("start")} style={{ padding: "10px 24px", fontFamily: "Georgia, serif", fontSize: 15, background: "#1a2744", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
              Vissza
            </button>
          </div>
        )}

        {phase === "done" && (
          <div style={{ background: "#fff", border: "1px solid #d8cdb8", borderRadius: 12, padding: "36px 32px", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,.08)" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
            <h2 style={{ fontSize: 22, color: "#1a2744", marginBottom: 8 }}>Kész!</h2>
            <p style={{ fontSize: 15, color: "#3a3530", marginBottom: 24, lineHeight: 1.7 }}>
              Minden kérdéshez generálva lettek a helytelen válaszok. Töltsd le a HTML fájlt és töltsd fel GitHubra.
            </p>
            <a
              href={downloadUrl}
              download="alapvizsga_teszt.html"
              style={{ display: "inline-block", padding: "14px 40px", fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, background: "#1a2744", color: "#fff", borderRadius: 10, textDecoration: "none", marginBottom: 16 }}
            >
              ⬇ Letöltés: alapvizsga_teszt.html
            </a>
            <p style={{ fontSize: 13, color: "#7a7060" }}>
              GitHub Pages-en: repository → Settings → Pages → main branch → / (root)<br />
              Utána a fájl elérhető lesz: https://felhasználónév.github.io/repository/alapvizsga_teszt.html
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
