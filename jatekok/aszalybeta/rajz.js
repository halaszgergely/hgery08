/* Aszálytúlélő: Nagy Szárazság – rajzok (vektoros SVG-ből raszterizált sprite-ok).
   A rajzok az ötletgyár terveiből jönnek: ellenségek, bossok, játszható karakterek, az Aszály Istene. */
const O='#120a07', G=`stroke="${O}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const gr=(id,a,b,c)=>`<linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${a}"/>${c?`<stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>`:`<stop offset="1" stop-color="${b}"/>`}</linearGradient>`;
let DEFS=`
${gr('gM','#eef1f4','#9aa3ae','#4a525c')}${gr('gD','#4a4452','#26212c','#0f0c12')}${gr('gB','#f4ead6','#c9b896')}${gr('gS','#ecd29a','#b8894a')}${gr('gT','#b6ae9f','#7a7366','#4a453e')}
${gr('gR','#d07a40','#7a3a18')}${gr('gC','#c8342a','#6a120e','#2a0606')}${gr('gF','#fff0a0','#ff8a1a','#b3260e')}${gr('gG','#a8ac62','#5e6230','#2e3018')}${gr('gW','#a8784a','#5a3a1e')}
${gr('gK','#c4ab8c','#8a7058','#4e3e30')}${gr('gA','#c9f0ff','#5ab0e0','#1e5a8a')}${gr('gL','#ffe9a0','#d8a030','#7a5410')}${gr('gN','#6a5a7a','#2e2438')}${gr('gU','#8a6a44','#4a3620')}${gr('gV','#5a6a4a','#2e3824')}
<filter id="gl" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="gl2" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter>`;
const S=(cx=60,w=30,y=106)=>`<ellipse cx="${cx}" cy="${y}" rx="${w}" ry="5" fill="#000" opacity=".28"/>`;
/* izzó, keskeny szemrés (anime-stílusú, nem „gombszem”) */
const Y=(x,y,c='#ff4a2a',l=5,t=-1)=>`<path d="M${x-l/2} ${y-t} L${x+l/2} ${y+t}" stroke="${c}" stroke-width="2.6" stroke-linecap="round" filter="url(#gl)"/><path d="M${x-l/3} ${y-t*.6} L${x+l/3} ${y+t*.6}" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".8"/>`;
const L=(d,c,w=4)=>`<path d="${d}" fill="none" stroke="${O}" stroke-width="${w+3}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const B=(d,w=1.6,c=O,o=1)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
const P=(d,f,x='')=>`<path d="${d}" fill="${f}" ${G} ${x}/>`;
const R=(x,y,rx,ry,o=.22)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o}"/>`;
const GL=(x,y,r,c,o=.55)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}" filter="url(#gl2)"/>`;
const st=(cx,cy,r1,r2,n,rot=0)=>{let p=[];for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,r=i%2?r2:r1;p.push((cx+Math.cos(a)*r).toFixed(1)+','+(cy+Math.sin(a)*r).toFixed(1))}return p.join(' ')};
/* csuklya: fej helyén sötét üreg, benne izzó szemek */
const hood=(cx,cy,r,f,eye='#ff4a2a')=>P(`M${cx-r} ${cy+r*1.2} Q${cx-r*1.15} ${cy-r*.6} ${cx} ${cy-r*1.5} Q${cx+r*1.15} ${cy-r*.6} ${cx+r} ${cy+r*1.2} Q${cx} ${cy+r*.75} ${cx-r} ${cy+r*1.2}Z`,f)+P(`M${cx-r*.62} ${cy+r*.7} Q${cx-r*.6} ${cy-r*.45} ${cx} ${cy-r*.8} Q${cx+r*.6} ${cy-r*.45} ${cx+r*.62} ${cy+r*.7} Q${cx} ${cy+r*.45} ${cx-r*.62} ${cy+r*.7}Z`,'#07050a')+Y(cx-r*.28,cy,eye,r*.32,-.4)+Y(cx+r*.28,cy,eye,r*.32,.4);
const robe=(x0,x1,top,bot,f)=>P(`M${x0} ${top} L${x1} ${top} L${x1+8} ${bot} L${x1} ${bot-6} L${(x0+x1)/2+8} ${bot+1} L${(x0+x1)/2} ${bot-5} L${(x0+x1)/2-8} ${bot+1} L${x0} ${bot-6} L${x0-8} ${bot}Z`,f);
const helm=(cx,cy,r)=>P(`M${cx-r} ${cy+r*.5} Q${cx-r} ${cy-r*1.1} ${cx} ${cy-r*1.2} Q${cx+r} ${cy-r*1.1} ${cx+r} ${cy+r*.5} L${cx+r*.7} ${cy+r*1.1} L${cx-r*.7} ${cy+r*1.1}Z`,'url(#gM)')+`<rect x="${cx-r*.75}" y="${cy-r*.12}" width="${r*1.5}" height="${r*.26}" fill="#0a0708"/>`+B(`M${cx} ${cy-r*1.2} L${cx} ${cy-r*.2}`,1.4,'#fff',.5);

const BI={kert:['Völgy átkai · 0′-tól','#7a8a3a'],sivatag:['Puszta népe · 10′-től','#d09a3c'],varos:['Aszályvár serege · 20′-tól','#8a6a5a'],meder:['Halott folyó · 30′-tól','#6a7a6a'],halo:['Szilárd árnyai · 40′-től','#c42a20']};

/* [id, név, pálya, szerep, viselkedés, élet, sebesség, rajz] – élet/sebesség: 1–5 */
const EN=[
['ghoul','Aszott földműves','kert','Horda','Az aszályban elpusztult falusiak kiszáradt teste. Lassú, de mindig sokan vannak; kaszájuk széles ívben csap.',1,2,
 S(60,28)+L('M84 106 L98 18','url(#gW)',3)+P('M98 18 Q72 8 50 26 Q72 20 94 30Z','url(#gM)')+L('M52 80 L46 104','url(#gK)',5)+L('M62 80 L68 104','url(#gK)',5)+P('M40 50 Q56 42 70 50 L74 86 L65 80 L58 88 L51 80 L38 86Z','url(#gU)')+B('M46 58 L60 56 M47 64 L61 62 M48 70 L60 69',1.2,'#2a1a0e',.7)+L('M68 54 L84 62 L92 46','url(#gK)',4)+L('M42 56 L34 74 L38 84','url(#gK)',4)+P('M44 40 Q42 26 54 24 Q64 26 62 40 Q58 48 52 48 Q46 48 44 40Z','url(#gK)')+P('M34 30 Q54 22 74 30 Q54 34 34 30Z','#a8894a')+P('M44 28 Q54 14 64 28Z','#b8995a')+Y(49,38,'#ffb43a',4)+Y(57,38,'#ffb43a',4)+B('M50 44 L56 44',1.2)],
['szalmabab','Szalmabáb-őr','kert','Őrző','Átkozott madárijesztő a kiszáradt földeken. Állva vár, amíg közel nem érsz, aztán sarlóval ugrik.',2,3,
 S(60,24)+L('M60 106 L60 34','url(#gW)',5)+L('M28 48 L92 48','url(#gW)',4)+robe(40,80,44,94,'url(#gD)')+B('M30 48 L22 56 M30 48 L24 44 M90 48 L98 56 M90 48 L96 42',1.6,'#d8b860')+B('M48 94 L46 102 M60 92 L60 102 M72 94 L74 102',1.6,'#d8b860')+L('M90 48 L98 40','url(#gW)',3)+P('M98 40 Q114 30 108 14 Q104 30 92 34Z','url(#gM)')+`<circle cx="60" cy="30" r="13" fill="url(#gS)" ${G}/>`+P('M40 24 Q60 18 80 24 L72 20 L64 2 L56 20Z','#3a2e22')+P('M36 25 Q60 18 84 25 Q60 29 36 25Z','#2a221a')+`<circle cx="55" cy="30" r="2.8" fill="#0a0604"/><circle cx="65" cy="30" r="2.8" fill="#0a0604"/>`+GL(55,30,3,'#ff8a2a',.9)+GL(65,30,3,'#ff8a2a',.9)+B('M52 37 L68 37 M54 35 L54 39 M58 35 L58 39 M62 35 L62 39 M66 35 L66 39',1.1)],
['tovis','Tövisinda','kert','Csapda','A szomjas föld alól feltörő, tüskés liána. Megköt, ha a közelébe érsz; a bimbója a gyenge pontja.',2,0,
 S(56,30)+P('M24 106 Q30 96 56 96 Q84 96 88 106Z','url(#gU)')+L('M50 100 Q30 76 50 58 Q70 42 60 24','url(#gV)',8)+B('M40 82 L33 78 M37 70 L30 68 M50 58 L56 52 M64 48 L71 50 M58 34 L52 30 M44 90 L38 92',2.4,'#2e3018')+L('M54 96 Q76 84 86 66','url(#gV)',4)+B('M70 82 L76 86 M80 74 L86 76',2,'#2e3018')+P('M60 24 Q44 14 50 2 Q58 10 60 6 Q62 10 70 2 Q76 14 60 24Z','url(#gC)')+P('M60 22 Q52 16 55 8 Q60 14 65 8 Q68 16 60 22Z','#3a0606')+GL(60,15,5,'#ff3a2a',.8)+`<circle cx="60" cy="15" r="2.4" fill="#ffd0a0"/>`],
['hollok','Hamuhollók','kert','Raj','Égett földek felett köröző hollócsapat. Hatosával csapnak le, aztán szétrebbennek.',1,5,
 S(60,40,108)+[[60,58,1],[26,32,.6],[94,28,.55]].map(([x,y,s])=>`<g transform="translate(${x} ${y}) scale(${s})">`+P('M-2 0 Q-20 -30 -54 -28 L-46 -22 L-54 -16 L-44 -12 L-50 -6 L-38 -4 L-40 2 L-26 2 Q-14 4 -2 10Z','url(#gD)')+P('M2 0 Q20 -30 54 -28 L46 -22 L54 -16 L44 -12 L50 -6 L38 -4 L40 2 L26 2 Q14 4 2 10Z','url(#gD)')+P('M-6 20 L-8 34 L0 30 L8 34 L6 20Z','#1a161e')+B('M-40 -12 L-30 -8 M-28 -16 L-20 -8 M40 -12 L30 -8 M28 -16 L20 -8',1.2,'#6a6070')+P('M-8 2 Q0 -10 8 2 Q10 16 0 26 Q-10 16 -8 2Z','#1a161e')+P('M-3 -6 L0 -18 L3 -6Z','#4a4450')+Y(-2,-1,'#ff7a2a',3,0)+`</g>`).join('')+`<g fill="#8a8070" opacity=".7"><circle cx="40" cy="88" r="1.6"/><circle cx="76" cy="94" r="1.3"/><circle cx="56" cy="98" r="1.1"/><circle cx="88" cy="80" r="1.4"/></g>`],
['farkas','Szikkadt farkas','kert','Vadász','Csontig soványodott farkas. Falkában jön, és mindig oldalról, a látóteredből kerül eléd.',2,4,
 S(60,44)+L('M30 76 L22 104','url(#gK)',4)+L('M42 78 L38 104','url(#gK)',4)+L('M80 76 L84 104','url(#gK)',4)+L('M90 72 L98 102','url(#gK)',4)+P('M14 60 Q8 54 4 58 Q10 62 18 66Z','url(#gK)')+P('M16 62 Q22 46 44 48 L74 46 Q92 44 98 54 L96 74 Q80 80 62 74 Q46 82 30 80 Q18 76 16 62Z','url(#gK)')+B('M50 54 Q52 66 50 74 M58 52 Q60 64 58 74 M66 52 Q68 62 66 72',1.3,'#3a2a1e',.8)+P('M30 50 L34 40 L38 50 L42 38 L46 50 L52 40 L56 50Z','#6a5440')+P('M92 50 Q100 36 108 40 Q116 44 118 52 L108 58 Q112 62 104 66 Q96 66 92 60Z','url(#gK)')+P('M96 42 L98 30 L104 40Z','#5a4636')+Y(105,46,'#ffd23a',5,-.6)+P('M110 58 L104 62 L112 61Z','#fff')+B('M108 56 L118 52',1.2)],
['vadkan','Tövishátú vadkan','kert','Rohamozó','Hátán kiszáradt tövisek nőttek. Megáll, kaparja a földet, majd egyenes vonalban roham.',4,3,
 S(58,44)+L('M34 80 L30 104','url(#gU)',5)+L('M48 82 L46 104','url(#gU)',5)+L('M76 82 L78 104','url(#gU)',5)+L('M88 78 L92 104','url(#gU)',5)+P('M20 70 Q20 44 50 40 Q82 36 96 52 L104 70 Q96 84 70 84 L40 86 Q22 84 20 70Z','url(#gU)')+P('M30 48 L34 30 L40 44 L46 24 L52 40 L58 22 L64 38 L70 24 L76 40 L82 30 L88 50Z','url(#gV)')+P('M92 52 Q110 52 116 66 L112 76 Q102 80 94 74Z','url(#gU)')+P('M108 72 Q118 70 116 58 Q114 68 106 68Z','url(#gB)')+P('M100 74 Q106 82 98 88 Q102 80 96 76Z','url(#gB)')+Y(102,60,'#ff5a2a',4,-.5)+B('M30 60 Q40 54 50 60',1.2,'#2a1a0e',.6)],
['porliderc','Porlidérc','kert','Lebegő','Az elporladt mezők haragja, csuklyás alakot öltve. Átsuhan a tárgyakon; halálakor vakító porfelhő marad utána.',2,2,
 S(60,22,110)+`<g opacity=".45" fill="#b8a07a"><circle cx="40" cy="100" r="4"/><circle cx="76" cy="102" r="3"/><circle cx="56" cy="106" r="2.5"/><circle cx="88" cy="94" r="2"/></g>`+P('M36 46 Q34 70 42 90 Q50 84 54 96 Q60 86 66 98 Q72 86 80 92 Q86 70 84 46Z','url(#gK)','opacity=".92"')+B('M44 60 Q50 76 46 88 M60 58 Q64 74 60 90 M74 60 Q72 76 78 88',1.2,'#5a4836',.6)+L('M38 54 L22 66 L14 62','url(#gK)',3)+B('M14 62 L10 58 M14 62 L9 63 M14 62 L11 67',1.4,'#d8c8a8')+hood(60,36,16,'url(#gK)','#ffb43a')],
['banya','Gyökérbanya','kert','Idéző','A kiszáradt erdő remete-varázslója. Gyökereket hív elő a földből, amik megkötnek; amíg él, a tövisindák is újranőnek.',3,1,
 S(60,30)+L('M88 106 Q84 70 92 40 Q96 26 88 16','url(#gW)',4)+P('M88 16 Q80 6 86 0 Q94 4 92 12 Q100 8 98 18Z','url(#gW)')+GL(90,10,5,'#9aff5a',.7)+robe(38,82,42,100,'url(#gV)')+B('M34 100 Q28 104 22 102 M44 102 Q42 106 36 108 M80 100 Q88 104 96 102',2,'#4a3620')+P('M38 46 L82 46 L86 54 L34 54Z','#3a3020')+B('M50 54 Q52 70 48 90 M70 54 Q68 74 72 92',1.2,'#1e2414',.7)+L('M80 52 L90 62','url(#gV)',4)+hood(60,32,15,'url(#gV)','#9aff5a')+P('M54 40 Q60 52 66 40Z','#d8d0c0','opacity=".8"')],
['futo','Pusztai gyíkfutó','sivatag','Felderítő','Gyíknép-lándzsás, aki lóhalálában fut, és messziről hajít. A horda előtt jár, és jelzi a társainak, hol vagy.',2,5,
 S(58,32)+L('M18 104 L100 18','url(#gW)',2.6)+P('M100 18 L108 8 L104 22Z','url(#gM)')+L('M28 96 Q14 100 6 92','url(#gG)',4)+L('M50 78 L40 104','url(#gG)',5)+L('M62 78 L74 102','url(#gG)',5)+P('M42 46 Q60 38 72 48 L70 82 Q56 88 46 82Z','url(#gS)')+P('M42 52 L72 50 L72 58 L42 60Z','#8a2a1a')+L('M70 52 L82 44','url(#gG)',4)+L('M44 54 L36 70 L46 78','url(#gG)',4)+P('M50 40 Q46 22 60 20 Q76 20 80 30 Q78 38 66 40Z','url(#gG)')+P('M48 28 Q60 12 74 22 L70 30 Q60 24 50 34Z','url(#gS)')+Y(70,30,'#ffd23a',4,0)+B('M66 36 L80 34',1.2)],
['sogolem','Sókristály-gólem','sivatag','Páncélos','A kiszáradt sóstavak kristályaiból állt össze. Elölről a kristálypáncél a sebzés 80%-át elnyeli.',5,1,
 S(60,40)+L('M48 84 L44 106','url(#gT)',8)+L('M72 84 L76 106','url(#gT)',8)+P('M32 40 L50 30 L74 30 L90 42 L86 86 L34 86Z','url(#gT)')+`<polygon points="40,40 48,18 56,38 62,10 70,36 78,20 82,42" fill="#f4f6fa" ${G}/>`+R(56,26,3,8,.8)+P('M34 50 Q18 54 16 76 L22 86 L34 80 L32 66Z','url(#gT)')+P('M86 50 Q102 54 104 76 L98 86 L86 80 L88 66Z','url(#gT)')+`<polygon points="14,84 20,72 28,86" fill="#e8f0ff" ${G}/><polygon points="96,86 104,72 108,88" fill="#e8f0ff" ${G}/>`+B('M44 56 L52 64 L48 78 M70 54 L64 66 L74 76',1.4,'#3a352e')+Y(52,48,'#9ae0ff',5)+Y(68,48,'#9ae0ff',5)],
['delibab','Délibáb-lovas','sivatag','Trükkös','Remegő lovas a forró levegőben. Három másolata vágtat egyszerre; csak az igazi vet árnyékot.',2,4,
 S(60,40)+`<g opacity=".72">`+L('M34 84 L26 104 M44 86 L42 104 M78 84 L82 104 M88 80 L96 102','url(#gA)',4)+P('M24 66 Q24 52 44 52 L80 50 Q94 48 98 58 L96 80 Q70 90 40 86 Q26 82 24 66Z','url(#gA)')+P('M94 56 Q100 38 112 34 L116 44 Q110 48 108 58 Q102 64 96 62Z','url(#gA)')+P('M22 60 Q10 62 6 78 Q14 70 22 70Z','#d8f4ff')+P('M50 52 L48 30 Q50 20 60 20 Q70 22 70 30 L70 50Z','url(#gA)')+L('M66 34 L108 10','#e8f8ff',2)+hood(60,22,9,'url(#gA)','#ffffff')+`</g>`+B('M16 46 Q26 42 36 46 T56 46 M70 72 Q80 68 90 72 T110 72',1.6,'#fff',.7)],
['keselyuember','Keselyű-dögész','sivatag','Ragadozó','Szárnyas dögevő a csatamezők felett. Körözve vár, és ha az életed 40% alá esik, lecsap.',2,4,
 S(60,34,108)+P('M54 46 Q24 20 4 30 Q16 36 12 44 Q26 40 28 50 Q38 46 50 62Z','url(#gU)')+P('M66 46 Q96 20 116 30 Q104 36 108 44 Q94 40 92 50 Q82 46 70 62Z','url(#gU)')+B('M12 36 L22 42 M24 30 L30 40 M108 36 L98 42 M96 30 L90 40',1.2,'#2a1a0e')+robe(46,74,48,96,'url(#gD)')+P('M46 50 Q60 42 74 50 Q60 58 46 50Z','#e8dcc8')+L('M72 60 L84 74','url(#gK)',3)+P('M84 74 Q98 72 102 60 Q96 76 82 80Z','url(#gM)')+P('M52 30 Q52 18 62 18 Q72 20 70 32 L64 40 Q56 40 52 30Z','#c89088')+P('M68 26 Q80 30 76 40 Q72 34 66 34Z','url(#gL)')+Y(62,26,'#ffd23a',4,-.4)],
['obeliszk','Napszem-obeliszk','sivatag','Lézer','Ősi kőoszlop, amibe a Napszem van vésve. Áll, majd sugarat lő egy vonalban; előtte vékony vörös vonal jelzi.',4,0,
 S(60,26)+P('M44 106 L48 22 L60 8 L72 22 L76 106Z','url(#gT)')+P('M40 100 L80 100 L84 106 L36 106Z','#5a544a')+B('M50 40 L70 40 M49 70 L71 70 M48 88 L72 88',1.2,'#3a352e')+GL(60,54,12,'#ffb52e',.8)+`<polygon points="${st(60,54,13,8,12)}" fill="url(#gL)" ${G}/>`+`<ellipse cx="60" cy="54" rx="7" ry="5" fill="#fff4d0" ${G}/><ellipse cx="60" cy="54" rx="2" ry="4.4" fill="#b3260e"/>`+`<g fill="#ffd27a" opacity=".85" font-family="serif" font-size="6" text-anchor="middle"><text x="60" y="34">ᚱᚢᚾ</text><text x="60" y="80">ᛟᛞᛁ</text></g>`],
['szkarabeusz','Bronzszkarabeusz','sivatag','Görgő','Fémfényű, kutyaméretű bogár. Gömbbé húzza magát és görög; ilyenkor visszaveri a lövedékeket.',3,3,
 S(60,40)+L('M34 80 L20 94 M38 88 L28 104 M86 80 L100 94 M82 88 L92 104 M46 90 L44 104 M74 90 L76 104','#2a1e14',3)+P('M28 70 Q28 40 60 36 Q92 40 92 70 Q90 92 60 94 Q30 92 28 70Z','url(#gL)')+B('M60 38 L60 94',1.8)+R(46,52,8,12,.35)+R(74,52,4,8,.2)+P('M44 38 Q60 22 76 38 Q60 44 44 38Z','#3a2a14')+P('M60 32 Q58 14 66 6 Q64 18 66 30Z','url(#gL)')+Y(52,36,'#7affc8',4,0)+Y(68,36,'#7affc8',4,0)],
['skorpio','Kőfarkú skorpió','sivatag','Mérgező','Kőpáncélos óriásskorpió. A farka izzó méregcseppet lő ívben, ami pocsolyaként marad a földön.',4,2,
 S(60,44)+L('M42 80 L28 96 M48 84 L40 102 M78 80 L92 96 M72 84 L80 102','url(#gT)',3)+P('M36 74 Q36 58 60 56 Q84 58 84 74 Q80 88 60 88 Q40 88 36 74Z','url(#gT)')+B('M48 58 L46 86 M60 56 L60 88 M72 58 L74 86',1.2,'#3a352e')+L('M60 58 Q56 36 66 22 Q78 10 90 18','url(#gT)',7)+P('M90 18 Q100 14 100 24 Q96 30 90 26Z','url(#gT)')+GL(98,26,5,'#9aff3a',.9)+L('M38 68 L20 60','url(#gT)',5)+P('M20 60 Q6 50 10 40 Q18 48 22 46 Q14 38 20 32 Q28 44 24 58Z','url(#gT)')+L('M82 68 L100 72','url(#gT)',5)+P('M100 72 Q114 66 112 54 Q106 64 102 62 Q110 56 104 48 Q96 58 98 70Z','url(#gT)')+Y(54,64,'#ff4a2a',3,0)+Y(66,64,'#ff4a2a',3,0)],
['ijasz','Nomád íjász','sivatag','Lövész','Arcát kendő takarja, szélvédett dűnék mögül lő. Ha közel érsz, hátraugrik és újra távolságot tart.',2,3,
 S(58,26)+L('M52 80 L46 104','url(#gU)',5)+L('M64 80 L70 104','url(#gU)',5)+robe(42,74,46,92,'url(#gS)')+P('M42 56 L74 54 L74 60 L42 62Z','#7a2a1a')+L('M72 54 L90 50','url(#gS)',4)+L('M44 56 L58 52 L72 52','url(#gS)',4)+B('M90 22 Q108 50 90 80',3,'#4a2e18')+B('M90 22 L72 52 L90 80',1,'#e8dcc8')+L('M72 52 L110 50','#e8dcc8',1.2)+P('M110 50 L104 47 L104 53Z','url(#gM)')+P('M46 36 Q46 20 58 18 Q72 20 70 36 Q66 46 58 46 Q50 46 46 36Z','url(#gS)')+P('M46 34 L70 34 L70 44 Q58 50 46 44Z','#8a6a4a')+Y(54,31,'#3a1a05',4,0)+Y(63,31,'#3a1a05',4,0)],
['zsoldos','Szomjas zsoldos','varos','Közelharcos','Fizetetlen, kiszáradt zsoldos horpadt páncélban. Alabárdjával előre szúr, három lépésnyire is elér.',3,2,
 S(58,28)+L('M30 106 L86 6','url(#gW)',2.6)+P('M86 6 L96 2 L92 14 L84 16 L80 8Z','url(#gM)')+L('M52 82 L48 104','url(#gD)',6)+L('M66 82 L70 104','url(#gD)',6)+P('M44 106 L44 100 L54 100 L54 106Z M64 106 L64 100 L74 100 L74 106Z','url(#gM)')+P('M42 48 Q58 40 76 48 L74 84 L44 84Z','url(#gM)')+P('M48 54 L70 54 L68 88 L50 88Z','url(#gC)')+B('M50 62 L60 66 L56 74',1.2,'#2a0606')+L('M74 52 L82 62 L74 72','url(#gM)',4)+L('M44 52 L38 68 L50 74','url(#gM)',4)+helm(59,34,13)+Y(55,33,'#ffb43a',3,0)+Y(63,33,'#ffb43a',3,0)],
['adoszedo','Vízadó-szedő','varos','Szívó','A vár kegyetlen adószedője. Ha hozzád ér, „beszedi a vizet”: 10 mp-re csökkenti a max. életedet, amíg el nem kapod.',3,2,
 S(56,26)+robe(40,74,44,100,'url(#gN)')+P('M40 50 L74 50 L72 58 L42 58Z','url(#gL)')+B('M57 58 L57 98',1.4,'#d8a030')+L('M72 56 L86 66','url(#gN)',4)+L('M86 66 L90 82','#8a8f99',1.4)+P('M84 82 L96 82 L94 94 L86 94Z','url(#gW)')+GL(90,86,4,'#4fb7ff',.8)+L('M42 56 L32 70','url(#gN)',4)+P('M22 64 L38 60 L42 76 L26 80Z','#e8dcc0')+B('M28 68 L36 66 M29 72 L37 70',1,'#5a4a2a')+P('M46 36 Q46 22 57 20 Q68 22 68 36 Q66 44 57 46 Q48 44 46 36Z','#d8c4a8')+P('M44 26 Q57 8 70 26 L66 22 Q57 16 48 22Z','#1a1420')+P('M42 26 L72 26 L68 20 L46 20Z','url(#gN)')+Y(52,33,'#8adfff',4,.3)+Y(62,33,'#8adfff',4,-.3)+B('M53 40 L61 40',1.1)],
['mag','Máglyapap','varos','Gyújtó','Az aszályt isteni büntetésnek hirdető pap. Lángoló füstölőjéből tűzcsík marad mögötte, ami 6 mp-ig ég.',3,2,
 S(56,26)+robe(40,74,44,100,'url(#gC)')+P('M50 44 L64 44 L62 100 L52 100Z','#e8dcc8')+B('M57 52 L57 92 M51 62 L63 62',1.6,'#c42a20')+L('M72 54 L88 62','url(#gC)',4)+L('M88 62 L94 76','#8a8f99',1.2)+P('M88 76 L100 76 L98 88 L90 88Z','url(#gL)')+GL(94,74,6,'#ff7a1a',.9)+P('M94 74 Q88 62 94 54 Q96 64 100 60 Q100 70 94 74Z','url(#gF)')+L('M42 56 L34 70 L44 76','url(#gC)',4)+P('M46 34 Q46 22 57 20 Q68 22 68 34 Q66 42 57 44 Q48 42 46 34Z','#d8c4a8')+P('M46 26 L50 6 L57 0 L64 6 L68 26Z','#e8dcc8')+B('M57 6 L57 22 M52 14 L62 14',1.4,'#c42a20')+Y(52,32,'#ff7a1a',4,.2)+Y(62,32,'#ff7a1a',4,-.2)],
['kopo','Parázskopó','varos','Vadász','A vár pincéiben tenyésztett vadászkutya, bőrén izzó repedések. Ahol fut, ott meggyullad a száraz fű.',2,5,
 S(58,42)+L('M30 76 L24 104','#2a1a14',4)+L('M42 80 L40 104','#2a1a14',4)+L('M78 78 L82 104','#2a1a14',4)+L('M88 74 L96 102','#2a1a14',4)+P('M10 56 Q4 44 12 38 Q14 50 22 56Z','url(#gF)')+P('M16 62 Q20 46 44 48 L76 46 Q92 44 98 54 L96 74 Q78 80 62 76 Q44 82 30 80 Q18 76 16 62Z','#2a1a14')+B('M32 56 L40 64 L36 72 M56 54 L62 62 L58 70 M74 52 L80 60',1.8,'#ff7a1a')+GL(58,62,10,'#ff5a1a',.35)+P('M92 50 Q100 36 110 40 Q118 46 116 56 L108 60 Q110 66 102 68 Q94 66 92 60Z','#2a1a14')+P('M96 42 L96 28 L104 40Z','#1a100c')+Y(106,48,'#ffb43a',5,-.6)+B('M104 60 L114 58',1.2,'#ff7a1a')],
['kutmimik','Kútmimik','varos','Csapda','A vár utolsó kútjának látszik. Aki inni lép hozzá, azt csápjaival berántja; legyőzve valódi gyógyvizet ad.',4,0,
 S(60,40)+P('M24 36 L60 14 L96 36Z','url(#gW)')+L('M30 36 L30 56 M90 36 L90 56','url(#gW)',4)+L('M30 42 L90 42','url(#gW)',2)+P('M22 56 L98 56 L96 102 L24 102Z','url(#gT)')+B('M22 72 L98 72 M23 88 L97 88 M40 56 L40 72 M66 56 L66 72 M54 72 L54 88 M80 72 L80 88 M38 88 L38 102 M72 88 L72 102',1.4,'#3a352e')+`<ellipse cx="60" cy="56" rx="38" ry="9" fill="#050304" ${G}/>`+`<path d="M28 56 L32 61 L36 56 L40 61 L44 56 L48 61 L52 56 L56 61 L60 56 L64 61 L68 56 L72 61 L76 56 L80 61 L84 56 L88 61 L92 56" fill="#e8dcc8" stroke="${O}" stroke-width="1"/>`+L('M44 58 Q30 40 18 48 Q24 40 34 44','#4a2a3a',3)+L('M76 58 Q92 44 104 52 Q98 44 88 46','#4a2a3a',3)+Y(52,54,'#ffd23a',3,0)+Y(68,54,'#ffd23a',3,0)],
['szamszerij','Várfali számszeríjász','varos','Lövész','A falakon áll, és célzott, nehéz vesszőt lő, ami átüt a hordán is. Lövés előtt fénylik a vessző hegye.',2,1,
 S(58,24)+L('M52 82 L48 104','url(#gD)',6)+L('M64 82 L68 104','url(#gD)',6)+P('M42 48 Q58 40 74 48 L72 86 L44 86Z','url(#gU)')+P('M46 50 L70 50 L68 88 L48 88Z','#3a4a6a')+P('M54 60 L62 60 L62 72 L58 76 L54 72Z','#d8b040')+L('M70 54 L86 56','url(#gU)',4)+L('M44 56 L60 60 L76 58','url(#gU)',4)+L('M66 58 L108 58','url(#gW)',4)+B('M96 46 Q90 58 96 70',3,'url(#gM)')+B('M96 46 L80 58 L96 70',.9,'#e8dcc8')+GL(110,58,4,'#ffd23a',.9)+P('M108 55 L114 58 L108 61Z','url(#gM)')+P('M46 30 Q46 20 58 18 Q70 20 70 30 L72 36 L44 36Z','url(#gM)')+P('M40 36 L76 36 L72 32 L44 32Z','url(#gM)')+P('M48 36 Q58 44 68 36 L66 42 Q58 46 50 42Z','#d8c4a8')+Y(54,38,'#3a1a05',3,0)+Y(63,38,'#3a1a05',3,0)],
['hirnok','Tilalmi hírnök','varos','Tiltó','A király rendeletét kürtöli: „Locsolni tilos!” Ha a hangja elér, egyik fegyvered 4 mp-re elhallgat.',3,3,
 S(56,26)+L('M52 82 L48 104','url(#gD)',5)+L('M64 82 L68 104','url(#gD)',5)+P('M42 46 Q58 38 74 46 L72 86 L44 86Z','url(#gC)')+P('M50 46 L66 46 L66 86 L50 86Z','url(#gL)')+P('M54 58 L62 58 L62 70 L58 74 L54 70Z','#7a120e')+L('M44 52 L30 44 L30 20','url(#gC)',4)+L('M30 104 L30 8','url(#gW)',2.4)+P('M30 10 L10 14 L12 44 L30 40Z','url(#gC)')+`<g transform="translate(20 27)"><circle r="8" fill="#e8dcc8" stroke="#2a0606" stroke-width="1.4"/><path d="M-4 1 L3 1 L4 -3 L-4 -3Z M3 -2 L6 -4" fill="#2a6ab8" stroke="#1a2a4a" stroke-width=".8"/><path d="M-6 -5 L6 5" stroke="#c42a20" stroke-width="2"/></g>`+L('M72 52 L84 46','url(#gC)',4)+P('M82 44 L104 32 L108 44 L86 50Z','url(#gL)')+GL(106,38,6,'#ffd23a',.5)+P('M48 32 Q48 20 58 18 Q68 20 68 32 Q66 40 58 42 Q50 40 48 32Z','#d8c4a8')+P('M46 24 Q58 10 72 22 L74 26 L46 26Z','#7a120e')+B('M72 22 Q80 16 82 26',2,'#e8dcc8')+Y(54,30,'#3a1a05',3,0)+Y(62,30,'#3a1a05',3,0)+B('M55 36 Q58 38 61 36',1)],
['pajzsfal','Pajzsfal-őr','varos','Pajzsos','Ember magas falpajzs mögül halad előre. Elölről mindent felfog; kerüld meg, vagy dobj át rajta valamit.',5,1,
 S(60,40)+L('M60 104 L60 6','url(#gW)',2.4)+P('M60 6 L64 14 L60 22 L56 14Z','url(#gM)')+helm(64,26,11)+Y(60,25,'#ffb43a',3,0)+Y(68,25,'#ffb43a',3,0)+P('M28 34 L92 34 L94 96 L60 106 L26 96Z','url(#gW)')+B('M44 34 L44 100 M76 34 L76 100',1.4,'#3a2414')+P('M28 34 L92 34 L92 40 L28 40Z M26 90 L94 90 L94 96 L26 96Z','url(#gM)')+`<circle cx="60" cy="64" r="15" fill="url(#gL)" ${G}/>`+`<polygon points="${st(60,64,13,6,8)}" fill="#7a5410" opacity=".7"/>`+`<circle cx="60" cy="64" r="5" fill="#c42a20" ${G}/>`],
['csontnaga','Csontnaga','meder','Csapkodó','A kiszáradt folyó egykori őrkígyója, ma csak csont. Háromágú szigonnyal szúr, farkával söpör.',4,3,
 S(58,42)+L('M18 98 Q38 108 58 98 Q76 90 90 96','url(#gB)',6)+[22,32,42,52,62,72,82].map((x,i)=>B(`M${x} ${100-(i%2)*4} l0 -6`,2,'#c9b896')).join('')+L('M58 96 Q50 80 54 62','url(#gB)',5)+[64,70,76,82,88].map(y=>B(`M44 ${y-16} Q54 ${y-10} 64 ${y-16}`,2.2,'#e8dcc4')).join('')+L('M54 62 L54 42','url(#gB)',4)+L('M54 50 L76 40 L86 20','url(#gB)',3)+L('M86 104 L86 8','url(#gR)',2.4)+P('M80 8 L86 0 L92 8 L90 16 L86 10 L82 16Z','url(#gR)')+L('M54 50 L36 62','url(#gB)',3)+P('M44 36 Q44 22 54 20 Q66 22 66 34 L62 44 L48 44Z','url(#gB)')+`<ellipse cx="50" cy="32" rx="3.4" ry="4" fill="#0a0604"/><ellipse cx="60" cy="32" rx="3.4" ry="4" fill="#0a0604"/>`+GL(50,32,3,'#4fffd0',.9)+GL(60,32,3,'#4fffd0',.9)+B('M49 40 L49 44 M53 40 L53 44 M57 40 L57 44 M61 40 L61 44',1.2)],
['iszap','Iszapkísértet','meder','Lassító','A mederben rekedt holtak iszapból összeállt alakja. Sárnyomot hagy, amiben lelassulsz, és minél tovább él, annál nagyobb.',3,2,
 S(60,34)+P('M30 104 Q28 80 34 62 Q32 40 46 30 Q60 22 74 30 Q88 40 86 62 Q92 80 90 104 L82 98 L76 106 L68 98 L60 106 L52 98 L44 106 L38 98Z','url(#gU)')+B('M38 64 Q36 76 40 86 M84 58 Q86 70 82 78',4,'#3a2614',.8)+L('M36 60 L20 78 L24 92','url(#gU)',5)+L('M84 60 L100 74 L98 88','url(#gU)',5)+P('M44 40 Q60 30 76 40 Q74 52 60 54 Q46 52 44 40Z','#1e140a')+Y(52,44,'#9cff5a',5,-.5)+Y(68,44,'#9cff5a',5,.5)+R(50,34,8,3,.15)+`<circle cx="22" cy="104" r="4" fill="#4a3620"/><circle cx="102" cy="104" r="3" fill="#4a3620"/>`],
['raklovag','Rákpáncélos lovag','meder','Páncélos','Folyami rákpáncélba öltözött lovag. Ollókesztyűjével elkap és dob; oldalról sebezhető.',4,2,
 S(60,30)+L('M50 82 L46 104','url(#gR)',6)+L('M68 82 L72 104','url(#gR)',6)+P('M38 44 Q58 34 80 44 L78 86 L40 86Z','url(#gC)')+B('M42 56 Q60 50 78 56 M42 68 Q60 62 78 68 M42 78 Q60 72 78 78',1.4,'#2a0606')+P('M36 42 Q30 36 38 32 L46 40Z M82 42 Q88 36 80 32 L72 40Z','url(#gC)')+L('M78 50 L94 60','url(#gC)',6)+P('M92 52 Q112 40 114 58 Q108 54 100 58 Q112 62 108 74 Q96 74 92 64Z','url(#gC)')+L('M40 50 L28 66 L34 80','url(#gC)',5)+L('M34 80 L30 104','url(#gM)',2)+P('M44 30 Q44 14 59 12 Q74 14 74 30 L70 40 L48 40Z','url(#gC)')+P('M48 26 L70 26 L68 32 L50 32Z','#0a0404')+Y(54,29,'#ffd23a',3,0)+Y(64,29,'#ffd23a',3,0)+L('M52 14 Q44 2 36 4 M66 14 Q74 2 82 4','#8a1a14',1.4)],
['zsilip','Zsilipőr','meder','Pajzsos','Kőből faragott ősi őrszobor, egy zsilipkapu tölgyfa pallóival a karján. Elölről minden lövedéket felfog.',5,1,
 S(60,44)+P('M34 30 Q34 14 60 12 Q86 14 86 30 L84 52 L36 52Z','url(#gT)')+B('M46 22 L52 28 M74 20 L70 30',1.4,'#3a352e')+Y(50,34,'#4fb7ff',6,-.5)+Y(70,34,'#4fb7ff',6,.5)+P('M20 48 L100 48 L98 104 L22 104Z','url(#gW)')+B('M20 64 L100 64 M21 80 L99 80 M22 96 L98 96',1.6,'#3a2414')+P('M14 42 L24 42 L24 106 L14 106Z M96 42 L106 42 L106 106 L96 106Z','url(#gM)')+L('M24 56 L96 92 M96 56 L24 92','url(#gM)',2)+`<circle cx="60" cy="74" r="6" fill="url(#gM)" ${G}/>`],
['reves','Fulladt révész','meder','Kísértet','Az egykori folyó révésze, aki a vízzel együtt tűnt el. Lámpásának fénye magához vonzza a közeli ellenségeket.',2,2,
 S(56,24,110)+`<g opacity=".88">`+P('M38 46 Q56 38 74 46 L78 92 Q66 86 62 98 Q56 88 50 98 Q46 86 34 92Z','url(#gA)')+L('M74 52 L88 50','url(#gA)',4)+L('M88 104 L92 10','url(#gW)',2.4)+L('M40 54 L28 66','url(#gA)',4)+L('M28 66 L28 76','#3a352e',1)+P('M22 76 L34 76 L32 90 L24 90Z','url(#gM)')+GL(28,83,8,'#9affe0',.8)+`<circle cx="28" cy="83" r="3" fill="#e8fff8"/>`+hood(56,32,14,'url(#gA)','#e8fff8')+P('M36 24 Q56 12 76 24 Q56 28 36 24Z','#2a4a5a')+`</g>`+B('M40 64 Q48 72 46 84 M66 60 Q70 72 68 84',1.2,'#1e5a8a',.6)],
['nimfa','Szikkadt nimfa','meder','Szívó','Egykor a folyó szelleme volt; most kiszáradva, szomjasan bolyong. Felszívja a pályán lévő pocsolyáidat, és azoktól erősödik.',3,2,
 S(60,26)+P('M40 50 Q60 42 80 50 L86 100 L74 94 L66 102 L58 94 L50 102 L44 94 L34 100Z','url(#gK)')+B('M50 60 L56 70 L52 82 M70 58 L66 72 L72 84',1.3,'#4e3e30')+P('M40 30 Q38 14 60 12 Q82 14 80 30 Q86 50 92 64 Q80 58 76 44 L44 44 Q40 58 28 64 Q34 50 40 30Z','#6a7a7a')+P('M48 32 Q48 20 60 20 Q72 20 72 32 Q70 42 60 44 Q50 42 48 32Z','#c9b49a')+B('M54 24 L52 34 M66 26 L68 36',.9,'#7a6650')+Y(54,32,'#6adfff',4,.4)+Y(66,32,'#6adfff',4,-.4)+B('M57 39 Q60 37 63 39',1)+L('M44 52 L34 70 L40 84','url(#gK)',3)+L('M76 52 L86 70 L80 84','url(#gK)',3)+GL(60,30,14,'#6adfff',.18)],
['pioca','Óriáspióca','meder','Tapadó','A mederben maradt utolsó tócsák lakója. Rád tapad, és amíg rajtad van, folyamatosan szívja az életed; rázd le mozgással.',2,2,
 S(60,44)+P('M12 82 Q14 62 36 60 Q60 56 84 62 Q106 66 108 84 Q100 98 70 96 Q40 100 20 94 Q10 90 12 82Z','url(#gN)')+[30,44,58,72,86].map(x=>B(`M${x} 62 Q${x+3} 78 ${x} 96`,1.4,'#1a1420',.7)).join('')+R(48,68,22,4,.18)+P('M96 70 Q116 66 118 80 Q116 94 98 92Z','#3a2a40')+`<ellipse cx="110" cy="80" rx="6" ry="9" fill="#2a0606" ${G}/>`+[...Array(8)].map((_,i)=>{const a=i*.785;return `<path d="M${(110+Math.cos(a)*6).toFixed(1)} ${(80+Math.sin(a)*9).toFixed(1)} L${(110+Math.cos(a)*3).toFixed(1)} ${(80+Math.sin(a)*4.5).toFixed(1)}" stroke="#e8dcc8" stroke-width="1.6"/>`}).join('')],
['kultista','Árnyprotokoll-kultista','halo','Gyógyító','Szikkadt Szilárd híve. A közeli ellenségeket gyógyítja és vörös pajzsot ad nekik; elsőnek kell leszedni.',3,2,
 S(60,28)+robe(38,82,40,102,'url(#gD)')+P('M38 58 L82 58 L82 64 L38 64Z','url(#gC)')+B('M60 64 L60 100',1.4,'#8a1a14')+B('M34 76 Q48 84 60 78 Q72 72 90 82',1.6,'#8a8f99')+[36,46,56,66,76,86].map((x,i)=>`<ellipse cx="${x}" cy="${78+(i%2?3:-2)}" rx="3.4" ry="2.4" fill="none" stroke="#9aa3ae" stroke-width="1.6"/>`).join('')+L('M80 50 L96 44','url(#gD)',4)+GL(100,40,8,'#ff3a2a',.9)+`<polygon points="${st(100,40,7,3,4,.78)}" fill="#ffb0a0"/>`+L('M40 50 L30 64','url(#gD)',4)+hood(60,28,15,'url(#gD)','#ff3a2a')],
['lancoslovag','Láncra vert lovag','halo','Behúzó','Egykor a Tanács lovagja volt; Szilárd láncai most őt rángatják. Láncot dob, és magához ránt.',4,2,
 S(60,30)+L('M50 82 L46 104','url(#gM)',7)+L('M70 82 L74 104','url(#gM)',7)+P('M38 44 Q60 34 82 44 L80 86 L40 86Z','url(#gM)')+P('M46 50 L74 50 L72 92 L48 92Z','url(#gD)')+B('M48 60 L58 70 L52 84 M72 58 L64 72',1.6,'#ff3a2a')+GL(60,70,10,'#ff3a2a',.3)+L('M80 50 L92 62 L86 72','url(#gM)',5)+L('M40 50 L28 60','url(#gM)',5)+[[22,64],[16,70],[12,78],[10,86],[12,94],[18,100]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="3.2" ry="4.4" fill="none" stroke="#9aa3ae" stroke-width="2"/>`).join('')+L('M86 72 L104 104','#2a1a1a',3)+P('M100 98 L112 104 L104 110Z','url(#gM)')+helm(60,28,13)+Y(56,27,'#ff3a2a',3,0)+Y(64,27,'#ff3a2a',3,0)+P('M47 18 L60 4 L73 18Z','url(#gC)')],
['runaszem','Megfigyelő rúnaszem','halo','Figyelő','A Watchdog-őrhálózat elrontott szeme. Ha 3 mp-ig egy helyben állsz, rád fókuszál és sugarat lő.',2,3,
 S(60,24,110)+GL(60,54,26,'#ff3a2a',.25)+`<circle cx="60" cy="54" r="30" fill="none" stroke="${O}" stroke-width="9"/><circle cx="60" cy="54" r="30" fill="none" stroke="url(#gM)" stroke-width="6"/>`+`<g fill="#ffd0a0" font-family="serif" font-size="7" text-anchor="middle" opacity=".9"><text x="60" y="22">ᚹᚨᛏᚲ</text><text x="60" y="92">ᛞᛟᚷ</text></g>`+[0,1,2,3].map(i=>{const a=i*1.571+.785;return `<polygon points="${st(60+Math.cos(a)*30,54+Math.sin(a)*30,6,3,4,a)}" fill="url(#gM)" ${G}/>`}).join('')+`<ellipse cx="60" cy="54" rx="18" ry="13" fill="#f4ece0" ${G}/><circle cx="60" cy="54" r="8" fill="url(#gC)" ${G}/><ellipse cx="60" cy="54" rx="2" ry="6" fill="#0a0404"/>`+R(55,49,3,2,.9)],
['hibagolem','Hibakód-gólem','halo','Teleportáló','Obszidiánból rakott gólem, amit Szilárd tiltott varázslata eltorzított. Recsegve „ugrik” egy közeli helyre, és ott csap le.',4,2,
 `<g transform="translate(-5 0)" opacity=".5"><path d="M34 40 L86 40 L90 86 L30 86Z" fill="#00e5ff"/></g><g transform="translate(5 0)" opacity=".5"><path d="M34 40 L86 40 L90 86 L30 86Z" fill="#ff2a4a"/></g>`+S(60,40)+L('M44 84 L40 106','#1a1620',8)+L('M76 84 L80 106','#1a1620',8)+P('M34 40 L86 40 L90 86 L30 86Z','#1e1a24')+B('M44 46 L54 60 L48 74 L58 84 M78 46 L68 58 L76 72',2,'#ff3a2a')+GL(56,62,10,'#ff3a2a',.4)+L('M32 46 L18 64 L22 82','#1e1a24',8)+L('M88 46 L102 64 L98 82','#1e1a24',8)+P('M44 18 L76 18 L80 40 L40 40Z','#26202e')+Y(52,29,'#ff3a2a',6,0)+Y(68,29,'#ff3a2a',6,0)+`<g fill="#ff3a2a"><rect x="12" y="20" width="5" height="3"/><rect x="100" y="94" width="6" height="3"/><rect x="96" y="14" width="4" height="2"/></g>`+R(50,22,10,2,.2)],
['letraor','Bukott létraőr','halo','Alakzat','A Ladder Mester egykori tanítványai, akiket Szilárd átállított. Hatos sorokban, létrafokokként menetelnek; ha egy kiesik, a többi gyorsul.',2,2,
 S(58,26)+L('M52 82 L48 104','url(#gD)',5)+L('M64 82 L68 104','url(#gD)',5)+robe(42,74,44,96,'url(#gV)')+P('M48 44 L68 44 L66 96 L50 96Z','#1e2414')+B('M50 54 L66 54 M50 64 L66 64 M50 74 L66 74 M50 84 L66 84',1.6,'#d8a030')+L('M90 104 L90 6 M100 104 L100 6','url(#gL)',2.4)+L('M90 20 L100 20 M90 34 L100 34 M90 48 L100 48 M90 62 L100 62','url(#gL)',2)+P('M86 6 L95 -2 L104 6Z','url(#gL)')+L('M72 52 L90 58','url(#gV)',4)+L('M44 52 L36 66 L44 74','url(#gV)',4)+hood(58,30,14,'url(#gV)','#ff3a2a')+GL(95,30,6,'#ff3a2a',.4)],
['kodliderc','Kódlidérc','halo','Átkozó','A Structured Text-mágia elszabadult maradéka: lebegő sorok, amik testet öltöttek. Átkot szór: egy fejlesztési kártyádat lezárja.',2,3,
 S(60,22,110)+GL(60,54,24,'#a06aff',.35)+P('M36 92 Q30 60 40 40 Q48 22 60 20 Q72 22 80 40 Q90 60 84 92 Q74 84 70 96 Q64 84 60 98 Q56 84 50 96 Q46 84 36 92Z','url(#gN)','opacity=".9"')+`<g font-family="monospace" font-size="6.2" fill="#d8c0ff" opacity=".95"><text x="42" y="54">IF hp&lt;0</text><text x="44" y="63">THEN</text><text x="46" y="72">  ÁTOK();</text><text x="42" y="81">END_IF;</text></g>`+B('M28 50 L18 46 M92 52 L104 48 M30 70 L20 74',1,'#d8c0ff',.6)+Y(52,36,'#ff3a2a',5,-.4)+Y(68,36,'#ff3a2a',5,.4)],
['tonpecset','TON-pecsét','halo','Akna','Időzítő-rúna a földön: 3-2-1 visszaszámol, majd robban, és az ellenségeket is sebzi. Ki lehet csalni a hordába.',1,0,
 S(60,46,100)+GL(60,84,30,'#ff3a2a',.35)+`<ellipse cx="60" cy="84" rx="48" ry="18" fill="none" stroke="#ff5a3a" stroke-width="2.4"/><ellipse cx="60" cy="84" rx="38" ry="14" fill="none" stroke="#ff5a3a" stroke-width="1.4"/>`+`<g fill="#ffb0a0" font-family="serif" font-size="7" text-anchor="middle"><text x="22" y="86">ᛏ</text><text x="98" y="86">ᛟ</text><text x="40" y="100">ᚾ</text><text x="80" y="100">ᛉ</text><text x="40" y="73">ᛁ</text><text x="80" y="73">ᛗ</text></g>`+`<text x="60" y="64" font-family="serif" font-size="40" font-weight="700" text-anchor="middle" fill="#ff5a3a" filter="url(#gl)">3</text>`+`<text x="60" y="90" font-family="serif" font-size="8" font-weight="700" text-anchor="middle" fill="#ffd0a0">TON</text>`],
['arnyfarkas','Árnyfarkas','halo','Vadász','Szikkadt Szilárd kopója: füstből és vörös fényből áll. Csak mozgás közben látszik teljesen; ha megállsz, elnyeli az árnyék.',3,5,
 `<g opacity=".55" fill="#1a1018"><circle cx="14" cy="70" r="7"/><circle cx="8" cy="60" r="4"/><circle cx="20" cy="82" r="5"/></g>`+S(62,40)+L('M34 76 L28 104','#1a1018',4)+L('M46 80 L44 104','#1a1018',4)+L('M80 78 L84 104','#1a1018',4)+L('M90 74 L98 102','#1a1018',4)+P('M20 60 Q24 44 46 46 L78 44 Q94 42 100 52 L98 74 Q80 80 64 76 Q46 82 32 80 Q20 76 20 60Z','#1a1018')+B('M30 54 Q48 50 64 56 M40 66 Q58 62 76 66',1.4,'#ff3a2a',.7)+P('M94 48 Q102 34 112 38 Q120 44 118 54 L110 58 Q112 64 104 66 Q96 64 94 58Z','#1a1018')+P('M98 40 L98 26 L106 38Z','#120a10')+Y(108,46,'#ff3a2a',6,-.6)+B('M106 58 L116 56',1.2,'#ff3a2a')]
];
/* ---------- régi bossok karakterlapjai (a beküldött lapok elrendezésében) ---------- */
DEFS+=(gr('gCa','#9cc070','#4f7a34','#22401a')+gr('gCb','#7aa858','#2e5220'));
const thorns=(x0,y0,x1,y1,n,dir=1)=>[...Array(n)].map((_,i)=>{const t=(i+.5)/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${3*dir} -2" stroke="#f4ead6" stroke-width="1" stroke-linecap="round"/>`}).join('');
const sigil=(x,y,s=1,c='#c42a20')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -22 L6 -6 L18 -14 L10 2 L22 8 L6 10 L0 24 L-6 10 L-22 8 L-10 2 L-18 -14 L-6 -6Z" fill="${c}" stroke="${O}" stroke-width="1.6"/><circle r="5" fill="#120a07"/><circle r="2.4" fill="#ff5a3a" filter="url(#gl)"/></g>`;

/* Kaktuszkirály – view: f/s/b, expr: calm/angry/laugh */
function kkHead(v,e){
  if(v==='b') return P('M78 104 Q74 60 100 54 Q126 60 122 104Z','url(#gCa)')+B('M90 58 L88 104 M100 54 L100 104 M110 58 L112 104',1.2,'#1e3a14',.7)+P('M76 66 L80 44 L90 58 L100 38 L110 58 L120 44 L124 66Z','url(#gL)')+P('M76 66 L124 66 L124 72 L76 72Z','#7a5410');
  const side=v==='s';
  let h=side?P('M84 104 Q80 60 104 54 Q126 60 124 104Z','url(#gCa)')+B('M96 56 L94 104 M108 56 L110 104',1.2,'#1e3a14',.7)+P('M122 80 L130 86 L122 90Z','url(#gCb)')
           :P('M78 104 Q74 60 100 54 Q126 60 122 104Z','url(#gCa)')+B('M86 62 L82 104 M114 62 L118 104',1.2,'#1e3a14',.6)+thorns(80,70,78,100,5,-1)+thorns(120,70,122,100,5,1);
  const ex=side?[114]:[90,110];
  if(e==='laugh') h+=ex.map(x=>B(`M${x-5} 82 Q${x} 76 ${x+5} 82`,2.2)).join('')+P(side?'M106 92 Q118 106 126 92Z':'M86 90 Q100 110 114 90Z','#2a0606')+(side?'':B('M90 92 L110 92',1.4,'#f4ead6'));
  else if(e==='angry') h+=ex.map((x,i)=>Y(x,83,'#ffd23a',7,side?-.8:(i?.9:-.9))+B(side?`M${x-6} 72 L${x+7} 78`:(i?`M${x+8} 71 L${x-6} 78`:`M${x-8} 71 L${x+6} 78`),2.6)).join('')+P(side?'M108 92 Q118 90 124 92 Q122 102 112 102Z':'M88 92 Q100 86 112 92 Q110 104 100 104 Q90 104 88 92Z','#2a0606')+(side?'':`<path d="M91 93 L94 97 L97 92 L100 97 L103 92 L106 97 L109 93" fill="#f4ead6"/>`);
  else h+=ex.map((x,i)=>Y(x,82,'#ffd23a',7,side?-.4:(i?.5:-.5))+B(side?`M${x-6} 75 L${x+6} 77`:(i?`M${x+7} 74 L${x-6} 77`:`M${x-7} 74 L${x+6} 77`),2.2)).join('')+B(side?'M110 95 L122 94':'M92 95 Q100 93 108 95',1.8);
  h+=side?P('M82 66 L86 46 L96 58 L104 38 L114 56 L122 46 L124 66Z','url(#gL)')+P('M82 66 L124 66 L124 72 L82 72Z','#7a5410')
         :P('M76 66 L80 44 L90 58 L100 38 L110 58 L120 44 L124 66Z','url(#gL)')+P('M76 66 L124 66 L124 72 L76 72Z','#7a5410')+`<circle cx="100" cy="62" r="4.5" fill="url(#gC)" ${G}/>`;
  h+=(side?[[86,42],[118,42]]:[[80,40],[100,34],[120,40]]).map(([x,y])=>`<polygon points="${st(x,y,7,3,6)}" fill="#ff6a9a" ${G}/><circle cx="${x}" cy="${y}" r="2" fill="#ffd23a"/>`).join('');
  return h;
}
function kk(v='f',e='calm'){
  let s=S(100,62,288);
  if(v==='f'){
    s+=P('M52 110 Q30 200 34 280 L60 270 L76 284 L100 272 L124 284 L140 270 L166 280 Q170 200 148 110Z','url(#gC)')+B('M38 270 L60 262 L76 276 L100 264 L124 276 L140 262 L162 270',2,'#d8a030',.9);
    s+=L('M40 24 L40 196','url(#gL)',4)+P('M40 6 L49 22 L40 32 L31 22Z','url(#gC)')+GL(40,20,9,'#ff3a2a',.7);
    s+=L('M86 208 L82 274','url(#gCa)',15)+L('M114 208 L118 274','url(#gCa)',15)+P('M70 248 L94 248 L94 282 L66 282Z','url(#gL)')+P('M106 248 L130 248 L134 282 L106 282Z','url(#gL)');
    s+=P('M68 110 Q60 150 70 210 L130 210 Q140 150 132 110 Q100 96 68 110Z','url(#gCa)')+B('M80 110 L78 208 M92 104 L92 210 M108 104 L108 210 M120 110 L122 208',1.3,'#1e3a14',.7)+thorns(70,130,72,200,6,-1)+thorns(130,130,128,200,6,1);
    s+=P('M74 118 Q100 110 126 118 L122 160 Q100 172 78 160Z','url(#gL)')+B('M100 114 L100 166',1.2,'#7a5410')+`<circle cx="100" cy="138" r="7" fill="url(#gC)" ${G}/>`+GL(100,138,6,'#ff3a2a',.6);
    s+=P('M74 162 L128 194 L128 206 L72 174Z','url(#gC)')+P('M68 198 L132 198 L132 210 L68 210Z','url(#gL)');
    s+=L('M70 128 Q44 134 42 110 L40 74','url(#gCa)',14)+thorns(48,128,40,80,6,-1)+L('M130 128 Q156 134 158 110 L160 86','url(#gCa)',14)+thorns(152,128,162,90,6,1);
    s+=P('M58 112 Q66 100 82 106 L80 124 Q66 126 58 112Z','url(#gL)')+P('M142 112 Q134 100 118 106 L120 124 Q134 126 142 112Z','url(#gL)');
    s+=`<circle cx="160" cy="80" r="9" fill="url(#gCa)" ${G}/>`+(e==='angry'?GL(160,76,14,'#ffd23a',.6)+[...Array(7)].map((_,i)=>{const a=-2.6+i*.45;return `<path d="M${(160+Math.cos(a)*14).toFixed(1)} ${(76+Math.sin(a)*14).toFixed(1)} L${(160+Math.cos(a)*30).toFixed(1)} ${(76+Math.sin(a)*30).toFixed(1)}" stroke="#f4ead6" stroke-width="1.8" stroke-linecap="round"/>`}).join(''):'');
    s+=kkHead('f',e);
  } else if(v==='s'){
    s+=P('M86 110 Q56 200 60 282 L84 274 L100 286 L108 274 Q100 200 106 110Z','url(#gC)');
    s+=L('M96 208 L90 274','url(#gCa)',15)+L('M110 208 L114 274','url(#gCa)',15)+P('M80 248 L102 248 L100 282 L76 282Z','url(#gL)')+P('M104 248 L124 248 L130 282 L106 282Z','url(#gL)');
    s+=P('M82 110 Q74 150 84 210 L124 210 Q132 150 124 110 Q102 100 82 110Z','url(#gCa)')+B('M94 106 L94 210 M110 106 L112 210',1.3,'#1e3a14',.7)+thorns(124,130,126,200,6,1);
    s+=P('M104 118 Q118 114 126 120 L124 158 Q116 166 106 160Z','url(#gL)')+P('M84 198 L126 198 L126 210 L84 210Z','url(#gL)');
    s+=L('M144 30 L144 200','url(#gL)',4)+P('M144 12 L152 26 L144 36 L136 26Z','url(#gC)')+GL(144,24,8,'#ff3a2a',.7);
    s+=L('M116 128 Q140 136 142 112 L144 86','url(#gCa)',14)+thorns(134,128,146,90,6,1)+P('M100 110 Q108 98 122 106 L120 124 Q108 126 100 110Z','url(#gL)');
    s+=kkHead('s',e);
  } else {
    s+=L('M86 208 L82 274','url(#gCa)',15)+L('M114 208 L118 274','url(#gCa)',15)+P('M70 248 L94 248 L94 282 L66 282Z','url(#gL)')+P('M106 248 L130 248 L134 282 L106 282Z','url(#gL)');
    s+=L('M70 128 Q44 134 42 110 L40 74','url(#gCa)',14)+L('M130 128 Q156 134 158 110 L160 86','url(#gCa)',14)+thorns(48,128,40,80,6,-1)+thorns(152,128,162,90,6,1);
    s+=P('M56 106 Q34 200 38 280 L62 270 L78 284 L100 272 L122 284 L138 270 L162 280 Q166 200 144 106 Q100 92 56 106Z','url(#gC)')+B('M42 270 L62 262 L78 276 L100 264 L122 276 L138 262 L158 270',2,'#d8a030',.9)+sigil(100,170,1.4,'#7a120e');
    s+=L('M40 24 L40 70','url(#gL)',4)+P('M40 6 L49 22 L40 32 L31 22Z','url(#gC)');
    s+=kkHead('b',e);
  }
  return s;
}

/* Homokféreg */
const segs=[[100,262,52],[95,238,48],[90,214,46],[90,190,44],[95,166,43],[101,144,42]];
function seg(x,y,r){return P(`M${x-r} ${y} Q${x-r} ${y-r*.62} ${x} ${y-r*.62} Q${x+r} ${y-r*.62} ${x+r} ${y} Q${x+r} ${y+r*.5} ${x} ${y+r*.5} Q${x-r} ${y+r*.5} ${x-r} ${y}Z`,'url(#gK)')+B(`M${x-r*.85} ${y+r*.2} Q${x} ${y+r*.62} ${x+r*.85} ${y+r*.2}`,2.2,'#d8b06a',.8)+P(`M${x-r*.92} ${y-r*.08} Q${x-r*.9} ${y-r*.6} ${x} ${y-r*.6} Q${x+r*.9} ${y-r*.6} ${x+r*.92} ${y-r*.08} Q${x} ${y-r*.26} ${x-r*.92} ${y-r*.08}Z`,'url(#gT)')+B(`M${x-r*.5} ${y-r*.52} L${x-r*.42} ${y-r*.2} M${x+r*.1} ${y-r*.6} L${x+r*.08} ${y-r*.26} M${x+r*.6} ${y-r*.48} L${x+r*.52} ${y-r*.16}`,1.2,'#3a352e',.8)+P(`M${x-r} ${y-2} L${x-r-14} ${y-14} L${x-r+4} ${y-12}Z`,'url(#gT)')+P(`M${x+r} ${y-2} L${x+r+14} ${y-14} L${x+r-4} ${y-12}Z`,'url(#gT)')+P(`M${x-r*.3} ${y-r*.6} L${x-r*.2} ${y-r*.6-9} L${x-r*.05} ${y-r*.58}Z M${x+r*.25} ${y-r*.6} L${x+r*.35} ${y-r*.6-8} L${x+r*.45} ${y-r*.56}Z`,'url(#gT)')+B(`M${x-r*.4} ${y+r*.1} L${x-r*.3} ${y+r*.4} M${x+r*.3} ${y} L${x+r*.4} ${y+r*.35}`,1.6,'#ff7a1a',.7);}
function hf(v='f',e='calm'){
  let s=S(100,80,288)+P('M6 292 Q40 250 100 254 Q160 250 194 292Z','url(#gS)')+B('M30 280 Q60 268 90 276 M110 272 Q140 266 172 280',1.4,'#a87c42');
  if(v==='s'){
    const pts=[[40,262,40],[62,232,40],[90,212,40],[118,188,38],[134,158,36]];
    s+=pts.map(([x,y,r])=>seg(x,y,r)).join('');
    s+=P('M114 156 Q108 104 148 88 Q186 86 194 120 L196 144 Q172 166 136 166Z','url(#gT)')+P('M170 90 Q186 64 200 66 Q188 74 184 96Z','url(#gU)')+B('M136 108 L150 150 M154 98 L162 146',1.4,'#3a352e');
    s+=e==='calm'?P('M186 116 L198 130 L186 144Z','url(#gU)'):P('M184 110 L198 98 L196 132 L198 160 L184 146Z','#1a0806')+[...Array(5)].map((_,i)=>`<path d="M${190} ${108+i*9} l6 3 l-6 3" fill="#f4ead6"/>`).join('')+GL(190,128,8,'#ff7a1a',.8);
    s+=P('M150 96 L156 80 L162 98Z M168 100 L176 86 L178 106Z','url(#gT)');
    return s;
  }
  s+=segs.map(([x,y,r])=>seg(x,y,r)).join('');
  if(v==='b'){
    s+=P('M52 110 Q50 60 104 54 Q158 60 156 110 Q150 140 104 142 Q58 140 52 110Z','url(#gT)')+B('M70 70 L70 132 M88 58 L88 140 M120 58 L120 140 M138 70 L138 132',1.6,'#3a352e');
    s+=[[104,50],[86,56],[122,56],[70,66],[138,66]].map(([x,y])=>P(`M${x-6} ${y+8} L${x} ${y-14} L${x+6} ${y+8}Z`,'url(#gT)')).join('');
    return s;
  }
  s+=P('M52 106 Q48 56 104 50 Q160 56 156 106 Q152 146 104 148 Q56 146 52 106Z','url(#gT)')+R(84,66,18,6,.18);
  if(e==='calm'){ s+=P('M104 100 L72 74 Q104 60 136 74Z','url(#gU)')+P('M104 100 L72 74 Q62 108 82 132Z','url(#gU)')+P('M104 100 L136 74 Q146 108 126 132Z','url(#gU)')+P('M104 100 L82 132 Q104 142 126 132Z','url(#gU)')+B('M88 86 L96 94 M120 86 L112 94',1.4,'#ff7a1a',.8)+P('M62 92 Q38 72 50 40 Q58 66 70 80Z','url(#gU)')+P('M146 92 Q170 72 158 40 Q150 66 138 80Z','url(#gU)')+GL(104,100,6,'#ff5a1a',.6);}
  else { const op=e==='angry'?32:22; s+=`<circle cx="104" cy="100" r="${op}" fill="#1a0806" ${G}/>`+GL(104,104,op*.5,'#ff5a1a',.8)+`<circle cx="104" cy="104" r="${op*.3}" fill="#ff8a3a" opacity=".6"/>`;
    s+=[...Array(16)].map((_,i)=>{const a=i*.3927,x=104+Math.cos(a)*op,y=100+Math.sin(a)*op,x2=104+Math.cos(a+.2)*op,y2=100+Math.sin(a+.2)*op,xi=104+Math.cos(a+.1)*(op-9),yi=100+Math.sin(a+.1)*(op-9);return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${xi.toFixed(1)} ${yi.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}Z" fill="#f4ead6" stroke="${O}" stroke-width=".8"/>`}).join('');
    s+=[...Array(10)].map((_,i)=>{const a=i*.628+.3,r=op*.55,x=104+Math.cos(a)*r,y=100+Math.sin(a)*r;return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${(104+Math.cos(a+.15)*(r-6)).toFixed(1)} ${(100+Math.sin(a+.15)*(r-6)).toFixed(1)} L${(104+Math.cos(a+.3)*r).toFixed(1)} ${(100+Math.sin(a+.3)*r).toFixed(1)}Z" fill="#d8c8a8"/>`}).join('');
    s+=P(`M${104-op-4} ${100-op*.4} Q${104-op-26} 70 ${104-op-14} 46 Q${104-op} 64 ${104-op+4} ${100-op*.7}Z`,'url(#gU)')+P(`M${104+op+4} ${100-op*.4} Q${104+op+26} 70 ${104+op+14} 46 Q${104+op} 64 ${104+op-4} ${100-op*.7}Z`,'url(#gU)');
    if(e==='angry') s+=`<g stroke="#e8c88a" stroke-width="2" opacity=".8" stroke-linecap="round"><path d="M30 60 l-14 -8 M24 92 l-16 0 M176 60 l14 -8 M182 92 l16 0"/></g>`;
  }
  return s;
}

/* ---------- a négy boss játékbeli modellje (a beküldött karakterlapok alapján) ---------- */
DEFS+=(gr('gSk','#fdeadc','#f0c8ae','#dca88e')+gr('gHp','#a27ae8','#6a3ec0','#2e1660')+gr('gHw','#ffffff','#d4d6e0','#9a9cac')+gr('gHs','#f6f6fa','#c4c6d2','#6e7080')+gr('gCo','#3a3446','#1c1824','#0c0a10')+gr('gRb','#2a3a2a','#141c14','#080c08')+gr('gPu','#b48aff','#7a4adf'));
const drop=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 14 Q-26 -2 -14 -14 M20 14 Q26 -2 14 -14" fill="none" stroke="#2a4a8a" stroke-width="3"/>${[-1,1].map(k=>[0,1,2,3].map(i=>`<ellipse cx="${k*(18+i*.6)}" cy="${10-i*7}" rx="2.4" ry="4.4" fill="#2a4a8a" transform="rotate(${k*(30+i*12)} ${k*(18+i*.6)} ${10-i*7})"/>`).join('')).join('')}<path d="M0 -18 Q10 -4 10 4 A10 10 0 0 1 -10 4 Q-10 -4 0 -18Z" fill="url(#gA)" stroke="#1a2a5a" stroke-width="1.6"/>${GL(0,2,6,'#7ad8ff',.8)}</g>`;
const runeTxt=(x,y,t,c='#ff5a3a',fs=6)=>`<text x="${x}" y="${y}" font-family="serif" font-size="${fs}" text-anchor="middle" fill="${c}">${t}</text>`;

/* anime arc: e = calm | angry | shout | laugh | smirk | grin */
function face(cx,cy,o){
  const iris=o.iris||'#7a4adf', lash='#1a1014', brow=o.brow||'#2a1a2a';
  let s=P(`M${cx-13.5} ${cy-6} Q${cx-14.5} ${cy+9} ${cx-8} ${cy+16.5} Q${cx} ${cy+22} ${cx+8} ${cy+16.5} Q${cx+14.5} ${cy+9} ${cx+13.5} ${cy-6} Q${cx} ${cy-19} ${cx-13.5} ${cy-6}Z`,'url(#gSk)');
  const e=o.e||'calm';
  [-1,1].forEach(k=>{const x=cx+k*6,y=cy+3;
    if(e==='laugh') s+=B(`M${x-3.4} ${y+1} Q${x} ${y-2.6} ${x+3.4} ${y+1}`,1.7,lash);
    else{ const ry=o.old?1.6:(e==='angry'?3.1:3.8);
      s+=`<ellipse cx="${x}" cy="${y+.6}" rx="${o.old?2.4:3.1}" ry="${ry}" fill="${iris}"/><ellipse cx="${x}" cy="${y+.9}" rx="1.3" ry="${ry*.55}" fill="#140a14"/><circle cx="${x-1}" cy="${y-ry*.35}" r="${o.old?.6:1}" fill="#fff"/>`;
      s+=B(e==='angry'?`M${x-4} ${y-2.6+(k<0?-1:1)*-1.2*0} L${x+4*1} ${y-2.6}`:`M${x-4} ${y-ry+.6} Q${x} ${y-ry-1.8} ${x+4} ${y-ry+.9}`,o.old?1.2:1.9,lash);}
    const bi=e==='angry'||e==='shout'||e==='grin';
    s+=B(bi?`M${x-k*4.4} ${y-6.4} L${x+k*4} ${y-9.6}`.replace(/x/,'')&&`M${x+k*4.2} ${y-9.4} L${x-k*4} ${y-6}`:`M${x-4} ${y-7.6} Q${x} ${y-9.2} ${x+4} ${y-7.9}`,o.old?2.6:1.4,brow);
    if(o.glasses) s+=`<rect x="${x-5.2}" y="${y-4.4}" width="10.4" height="8.4" rx="2" fill="#bfe0ff" fill-opacity=".18" stroke="#2a2030" stroke-width="1.1"/>`;
  });
  if(o.glasses) s+=B(`M${cx-.8} ${cy+1.8} L${cx+.8} ${cy+1.8}`,1.1,'#2a2030');
  if(o.old) s+=B(`M${cx-12} ${cy+1} L${cx-9} ${cy+3} M${cx+12} ${cy+1} L${cx+9} ${cy+3} M${cx-4} ${cy-6} L${cx+4} ${cy-6}`,.8,'#b08a74');
  s+=B(`M${cx+.6} ${cy+8} L${cx-.5} ${cy+10.2}`,1,'#c8907a');
  if(!o.beard){
    if(e==='shout') s+=P(`M${cx-3.6} ${cy+13} Q${cx} ${cy+11.6} ${cx+3.6} ${cy+13} Q${cx+3} ${cy+18.4} ${cx} ${cy+18.4} Q${cx-3} ${cy+18.4} ${cx-3.6} ${cy+13}Z`,'#7a2020');
    else if(e==='laugh'||e==='grin'||e==='smile') s+=P(`M${cx-4.8} ${cy+12.4} Q${cx} ${cy+19.6} ${cx+4.8} ${cy+12.4}Z`,'#7a2020')+(e==='grin'?`<path d="M${cx-3.4} ${cy+12.8} L${cx-2.4} ${cy+15.4} L${cx-1.4} ${cy+12.9}Z M${cx+3.4} ${cy+12.8} L${cx+2.4} ${cy+15.4} L${cx+1.4} ${cy+12.9}Z" fill="#fff"/>`:`<path d="M${cx-3.6} ${cy+12.9} L${cx+3.6} ${cy+12.9} L${cx+3} ${cy+14} L${cx-3} ${cy+14}Z" fill="#fff"/>`);
    else if(e==='smirk') s+=B(`M${cx-3} ${cy+14.2} Q${cx+1} ${cy+15.2} ${cx+4.4} ${cy+12.4}`,1.3,'#8a3a3a');
    else s+=B(`M${cx-2.4} ${cy+14} Q${cx} ${cy+14.7} ${cx+2.4} ${cy+14}`,1.2,'#8a4a44');
  }
  return s;
}
function prof(cx,cy,o){
  const e=o.e||'calm';
  let s=P(`M${cx-12} ${cy-8} Q${cx-15} ${cy+9} ${cx-5} ${cy+17} Q${cx+3} ${cy+21.5} ${cx+8.6} ${cy+16} L${cx+9.6} ${cy+12} L${cx+12.4} ${cy+8.4} L${cx+11} ${cy+5.4} Q${cx+13.6} ${cy-13} ${cx-12} ${cy-8}Z`,'url(#gSk)');
  s+=`<ellipse cx="${cx+6}" cy="${cy+3.4}" rx="${o.old?1.2:1.6}" ry="${o.old?1.4:3.4}" fill="${o.iris||'#7a4adf'}"/>`+B(`M${cx+3.6} ${cy+.2} Q${cx+6} ${cy-1.4} ${cx+8.2} ${cy+.6}`,1.6,'#1a1014')+B(`M${cx+3} ${cy-4.6} L${cx+9} ${cy-5.4}`,o.old?2.4:1.3,o.brow||'#2a1a2a');
  if(o.glasses) s+=`<rect x="${cx+3}" y="${cy-.8}" width="6" height="8" rx="1.6" fill="none" stroke="#2a2030" stroke-width="1.1"/>`+B(`M${cx+3} ${cy+2} L${cx-6} ${cy+1}`,1,'#2a2030');
  if(!o.beard) s+=B(`M${cx+5} ${cy+14} L${cx+8.2} ${cy+13.6}`,1.2,'#8a4a44');
  return s;
}
const sideBody=(f)=>`<g transform="translate(100 0) scale(.66 1) translate(-100 0)">${f}</g>`;
const legs=(c,w=9,boot='#1a1418',x0=90,x1=110)=>L(`M${x0} 162 L${x0-2} 278`,c,w)+L(`M${x1} 162 L${x1+2} 278`,c,w)+P(`M${x0-8} 250 L${x0+5} 250 L${x0+6} 284 L${x0-12} 287Z M${x1-5} 250 L${x1+8} 250 L${x1+12} 287 L${x1-6} 284Z`,boot);

/* ===== Structured Text Boszorkány ===== */
function stw(v='f',e='calm'){
  let s=S(100,60,288);
  const hairBack=P('M78 58 Q74 28 100 26 Q126 28 122 58 L125 84 L117 77 L113 86 L100 70 L87 86 L83 77 L75 84Z','url(#gHp)');
  const coatBack=P('M70 96 Q50 190 40 282 L68 276 L82 287 L100 272 L118 287 L132 276 L160 282 Q150 190 130 96Z','url(#gCo)')+B('M42 278 L68 272 L82 283 L100 268 L118 283 L132 272 L158 278',2.2,'#9a6aff');
  const body=()=>{let b='';
    b+=L('M90 176 L89 196','url(#gSk)',9)+L('M110 176 L111 196','url(#gSk)',9)+L('M89 196 L88 278','#2a2230',9)+L('M111 196 L112 278','#2a2230',9)+B('M84 198 L94 198 M106 198 L116 198',2.4,'#9aa3ae');
    b+=P('M80 248 L96 248 L97 286 L78 288Z M104 248 L120 248 L122 288 L103 286Z','#18121c')+B('M82 256 L95 256 M82 266 L95 266 M105 256 L118 256 M105 266 L118 266',1.6,'#9aa3ae');
    b+=P('M84 140 L116 140 L124 180 L76 180Z','#ecE8f2')+B('M92 142 L88 178 M108 142 L112 178',1,'#b8b0c8');
    b+=P('M84 96 L116 96 L118 142 L82 142Z','#1e1a24')+B('M86 106 L114 106 M85 118 L115 118 M84 130 L116 130',1.6,'#9aa3ae');
    b+=P('M72 94 L86 98 L84 150 L76 246 Q64 200 66 150Z','url(#gCo)')+P('M128 94 L114 98 L116 150 L124 246 Q136 200 134 150Z','url(#gCo)')+B('M84 100 L82 150 L76 240 M116 100 L118 150 L124 240',2,'#9a6aff');
    b+=[[72,180],[130,180],[70,220],[132,220]].map(([x,y])=>`<polygon points="${x},${y-6} ${x+4},${y} ${x},${y+6} ${x-4},${y}" fill="#9a6aff" opacity=".85"/>`).join('');
    b+=P('M78 140 L122 140 L122 148 L78 148Z','#5a3a24')+P('M80 148 L90 148 L90 162 L80 162Z M110 148 L120 148 L120 160 L110 160Z','#6a4a2e')+`<rect x="96" y="139" width="8" height="10" fill="none" stroke="#c4c8d0" stroke-width="1.6"/>`;
    b+=P('M100 104 L106 112 L100 122 L94 112Z','url(#gPu)')+GL(100,112,6,'#b48aff',.8);
    b+=P('M78 82 L90 92 L100 96 L110 92 L122 82 L126 98 L100 106 L74 98Z','#1a1420')+B('M80 86 L100 100 L120 86',1.6,'#9a6aff');
    b+=P('M64 92 Q78 82 92 92 L88 108 L66 114Z','url(#gCo)')+P('M136 92 Q122 82 108 92 L112 108 L134 114Z','url(#gCo)')+B('M66 112 L88 106 M134 112 L112 106',1.6,'#9a6aff');
    return b;};
  if(v==='b'){
    s+=body()+coatBack+P('M100 140 L118 170 L100 200 L82 170Z','#9a6aff','opacity=".9"')+P('M100 150 L110 170 L100 190 L90 170Z','#1a1420');
    s+=P('M66 100 L52 150 L58 166 L74 130Z M134 100 L148 160 L140 172 L126 130Z','url(#gCo)');
    s+=P('M78 58 Q74 28 100 26 Q126 28 122 58 L124 84 L100 88 L76 84Z','url(#gHp)')+B('M90 36 Q88 60 90 84 M100 30 L100 86 M110 36 Q112 60 110 84',1,'#2e1660',.6)+`<rect x="112" y="40" width="7" height="4" rx="1" fill="#c4c8d0" ${G}/>`;
    return s;
  }
  if(v==='s'){
    s+=sideBody(coatBack+body())+P('M106 100 L118 150 L112 166 L100 130Z','url(#gCo)')+`<circle cx="114" cy="162" r="4" fill="url(#gSk)" ${G}/>`;
    s+=P('M84 58 Q80 28 102 26 Q124 30 120 56 L118 70 L108 60 L96 82 L84 80Z','url(#gHp)')+prof(103,58,{e,iris:'#8a5adf',glasses:1})+P('M90 50 Q94 32 108 34 Q120 38 116 50 L110 44 L106 50 L100 42Z','url(#gHp)')+`<rect x="88" y="44" width="6" height="4" rx="1" fill="#c4c8d0" ${G}/>`;
    return s;
  }
  s+=coatBack+hairBack+body();
  s+=P('M66 100 L50 146 L38 152 L48 162 L72 130Z','url(#gCo)')+B('M50 146 L40 152',2,'#9a6aff')+`<circle cx="44" cy="146" r="4.4" fill="url(#gSk)" ${G}/>`;
  s+=P('M134 100 L148 158 L160 170 L138 172 L126 130Z','url(#gCo)')+`<circle cx="150" cy="168" r="4.4" fill="url(#gSk)" ${G}/>`;
  s+=[[14,104,26,18],[22,128,22,14],[6,150,20,16]].map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#b48aff" fill-opacity=".22" stroke="#b48aff" stroke-width="1"/>`+[0,1,2].map(i=>`<path d="M${x+3} ${y+4+i*4} L${x+w*(.5+((i*37)%5)/10)} ${y+4+i*4}" stroke="#d8c0ff" stroke-width="1"/>`).join('')).join('')+GL(40,140,10,'#b48aff',.35);
  s+=`<rect x="94" y="76" width="12" height="8" fill="url(#gSk)"/>`+face(100,58,{e:e==='angry'?'angry':e,iris:'#8a5adf',brow:'#3a1e6a',glasses:1});
  s+=P('M84 52 Q86 32 100 32 Q116 32 118 52 L113 45 L109 54 L103 42 L97 53 L92 44 L88 54Z','url(#gHp)')+`<rect x="112" y="40" width="7" height="4" rx="1" fill="#c4c8d0" ${G}/>`;
  return s;
}

/* ===== Ladder Mester ===== */
function ldm(v='f',e='calm'){
  let s=S(100,60,288);
  const robe=P('M66 96 Q54 190 46 284 L154 284 Q146 190 134 96Z','url(#gRb)')+B('M48 278 L152 278',3,'#d8a030');
  const stole=P('M88 96 L112 96 L116 284 L84 284Z','#1e4a26')+L('M91 100 L88 280 M109 100 L112 280','url(#gL)',1.6)+[...Array(11)].map((_,i)=>B(`M${90-i*.15} ${112+i*16} L${110+i*.15} ${112+i*16}`,1.6,'#e8b040')).join('');
  const belt=P('M70 150 L130 150 L130 160 L70 160Z','#5a3a24')+`<circle cx="100" cy="155" r="9" fill="url(#gL)" ${G}/>`+B('M96 149 L96 161 M104 149 L104 161 M96 152 L104 152 M96 158 L104 158',1.2,'#5a3a10')+P('M120 160 L130 160 L130 176 L120 176Z M72 160 L82 160 L82 172 L72 172Z','#6a4a2e');
  const staff=L('M152 290 L156 34','url(#gW)',4)+P('M146 10 L150 10 L152 50 L148 50Z M162 10 L166 10 L164 50 L160 50Z','url(#gL)')+[16,26,36,46].map(y=>B(`M150 ${y} L164 ${y}`,2,'#d8a030')).join('')+GL(157,26,14,'#ffd23a',.45);
  const hood=P('M70 72 Q68 22 100 16 Q132 22 130 72 L136 104 L64 104Z','url(#gRb)')+B('M72 70 Q70 26 100 20 Q130 26 128 70',2,'#d8a030')+P('M80 76 Q80 38 100 34 Q120 38 120 76Z','#0a0c0a');
  if(v==='b'){
    s+=robe+P('M70 72 Q68 22 100 16 Q132 22 130 120 L100 132 L70 120Z','url(#gRb)')+B('M100 24 L100 128',1.4,'#d8a030',.7)+[...Array(6)].map((_,i)=>B(`M88 ${40+i*14} L112 ${40+i*14}`,1.4,'#d8a030',.7)).join('')+B('M88 30 L86 124 M112 30 L114 124',1.4,'#d8a030',.7);
    s+=P('M66 104 L48 170 L60 176 L76 130Z M134 104 L152 170 L140 176 L124 130Z','url(#gRb)')+staff;
    return s;
  }
  if(v==='s'){
    s+=sideBody(robe+stole+belt)+P('M84 72 Q82 22 106 16 Q130 24 126 72 L130 104 L76 104Z','url(#gRb)')+B('M86 70 Q84 26 106 20',2,'#d8a030')+P('M96 74 Q96 40 112 38 Q124 44 122 74Z','#0a0c0a');
    s+=prof(108,58,{e,iris:'#5a6a7a',old:1,beard:1,brow:'#f0f0f4'})+P('M106 70 Q102 104 112 124 Q122 100 120 70 Q114 78 106 70Z','url(#gHw)')+P('M108 66 Q116 70 122 66 Q118 74 110 72Z','url(#gHw)');
    s+=P('M106 104 L126 150 L120 162 L100 130Z','url(#gRb)')+`<circle cx="124" cy="156" r="4.6" fill="url(#gSk)" ${G}/>`+L('M124 290 L126 34','url(#gW)',4)+P('M118 10 L122 10 L124 50 L120 50Z M132 10 L136 10 L134 50 L130 50Z','url(#gL)')+[16,26,36,46].map(y=>B(`M121 ${y} L134 ${y}`,2,'#d8a030')).join('');
    return s;
  }
  s+=robe+stole+belt+staff;
  s+=P('M66 104 L50 150 L36 160 L48 170 L74 132Z','url(#gRb)')+B('M50 150 L38 160',2,'#d8a030')+`<circle cx="42" cy="156" r="5" fill="url(#gSk)" ${G}/>`+GL(34,146,10,'#ffd23a',.55)+P('M26 134 L30 134 L30 156 L26 156Z M38 134 L42 134 L42 156 L38 156Z','#ffd23a','opacity=".85"')+B('M28 140 L40 140 M28 148 L40 148',1.4,'#ffd23a');
  s+=P('M134 104 L150 150 L156 122 L160 126 L156 156 L140 158 L126 132Z','url(#gRb)')+`<circle cx="154" cy="122" r="5" fill="url(#gSk)" ${G}/>`;
  s+=hood+`<rect x="94" y="74" width="12" height="8" fill="url(#gSk)"/>`+face(100,58,{e,iris:'#5a6a7a',old:1,beard:1,brow:'#f0f0f4'});
  s+=P('M84 66 Q84 112 100 132 Q116 112 116 66 Q108 76 100 72 Q92 76 84 66Z','url(#gHw)')+B('M92 84 Q94 104 98 120 M108 84 Q106 104 102 120 M100 80 L100 126',1,'#9a9cac',.7)+P('M88 70 Q96 66 100 72 Q104 66 112 70 Q106 76 100 74 Q94 76 88 70Z','url(#gHw)');
  if(e==='shout') s+=P('M96 74 Q100 72 104 74 Q103 80 100 80 Q97 80 96 74Z','#4a1414');
  s+=P('M78 50 Q80 40 90 42 L86 66 Q80 62 78 50Z M122 50 Q120 40 110 42 L114 66 Q120 62 122 50Z','url(#gHw)');
  return s;
}

/* ===== Watchdog Lovag ===== */
function wdk(v='f',e='calm'){
  let s=S(100,62,288);
  const cape=P('M64 96 Q44 190 38 284 L162 284 Q156 190 136 96Z','url(#gC)')+B('M40 278 L160 278',2,'#e8dcc8',.6)+[[56,250],[144,250]].map(([x,y])=>`<path d="M${x-6} ${y} L${x} ${y-10} L${x+6} ${y} L${x} ${y+6}Z" fill="#e8dcc8" opacity=".6"/>`).join('');
  const lg=L('M88 168 L84 276','url(#gM)',15)+L('M112 168 L116 276','url(#gM)',15)+P('M80 206 L92 206 L90 220 L80 220Z M108 206 L120 206 L120 220 L110 220Z','#2a2a32')+B('M82 213 L90 213 M110 213 L118 213',1.6,'#ff3a2a')+P('M72 262 L94 262 L96 288 L68 288Z M106 262 L128 262 L132 288 L104 288Z','#2a2a32');
  const torso=P('M72 92 Q100 82 128 92 L124 138 L76 138Z','url(#gM)')+P('M84 98 L116 98 L112 130 L88 130Z','#2a2a32')+B('M100 98 L100 130',1.4,'#9aa3ae')+P('M76 136 L124 136 L124 146 L76 146Z','#4a3420')+P('M80 146 L92 146 L92 160 L80 160Z M108 146 L120 146 L120 160 L108 160Z','#5a3a24');
  const tabard=P('M86 146 L114 146 L118 236 L100 246 L82 236Z','url(#gC)')+`<path d="M100 168 Q108 180 108 188 A8 8 0 0 1 92 188 Q92 180 100 168Z" fill="#e8dcc8"/>`+B('M90 200 L100 210 L110 200',1.6,'#e8dcc8',.8);
  const paul=P('M58 92 Q70 74 92 84 L90 108 L60 114Z','url(#gM)')+P('M142 92 Q130 74 108 84 L110 108 L140 114Z','url(#gM)')+B('M62 104 L88 98 M138 104 L112 98',1.4,'#4a525c')+P('M62 88 L66 80 L72 88Z M138 88 L134 80 L128 88Z','#c42a20');
  const sword=P('M53 140 L63 140 L61 280 L58 290 L55 280Z','url(#gM)')+B('M58 144 L58 278',1.6,'#ff3a2a')+GL(58,210,8,'#ff3a2a',.5)+P('M44 132 L72 132 L72 140 L44 140Z','#2a2a32')+L('M58 132 L58 116','#3a2a20',4)+`<circle cx="58" cy="112" r="4" fill="#c42a20" ${G}/>`;
  const helmF=(ex)=>P('M84 66 Q80 36 100 30 Q120 36 116 66 L112 84 L88 84Z','url(#gM)')+P('M86 42 L80 14 L96 34Z M114 42 L120 14 L104 34Z','url(#gM)')+B('M84 22 L90 32 M116 22 L110 32',1.4,'#c42a20')+P('M86 54 L100 62 L114 54 L114 62 L100 70 L86 62Z','#120808')+(ex==='angry'?B('M88 56 L100 64 L112 56',3.4,'#ff6a4a')+GL(100,62,10,'#ff3a2a',.8):B('M88 57 L100 64 L112 57',2.4,'#ff3a2a')+GL(100,62,6,'#ff3a2a',.6))+(ex==='shout'?P('M92 72 L108 72 L106 82 L94 82Z','#2a0606')+`<path d="M94 72 L96 76 L98 72 L100 76 L102 72 L104 76 L106 72" fill="#e8dcc8"/>`:P('M92 72 L108 72 L106 80 L94 80Z','url(#gM)')+B('M95 75 L105 75 M95 78 L105 78',1,'#4a525c'))+B('M100 30 L100 52',1.4,'#fff',.5);
  if(v==='b'){
    s+=lg+torso+cape+`<path d="M100 150 Q118 176 118 190 A18 18 0 0 1 82 190 Q82 176 100 150Z" fill="#e8dcc8" opacity=".9"/>`+paul+P('M84 66 Q80 36 100 30 Q120 36 116 66 L112 84 L88 84Z','url(#gM)')+P('M86 42 L80 14 L96 34Z M114 42 L120 14 L104 34Z','url(#gM)')+B('M100 32 L100 80',2,'#4a525c');
    s+=L('M60 108 L52 140','url(#gM)',11)+L('M140 108 L148 140','url(#gM)',11);
    return s;
  }
  if(v==='s'){
    s+=P('M76 96 Q60 190 62 284 L118 284 Q112 190 110 96Z','url(#gC)')+sideBody(lg+torso+tabard)+P('M88 84 Q104 76 116 86 L114 108 L90 112Z','url(#gM)');
    s+=P('M88 66 Q86 36 104 30 Q122 36 122 62 L126 70 L118 84 L92 84Z','url(#gM)')+P('M96 42 L94 14 L106 34Z','url(#gM)')+P('M110 54 L126 60 L126 68 L110 64Z','#120808')+B('M112 58 L126 64',2.4,'#ff3a2a')+GL(120,62,6,'#ff3a2a',.6);
    s+=L('M104 108 L118 140','url(#gM)',11)+`<g transform="translate(64 0)">${sword}</g>`;
    return s;
  }
  s+=cape+lg+torso+tabard+sword+L('M70 104 L60 128','url(#gM)',12)+L('M130 104 L140 140','url(#gM)',12)+`<circle cx="141" cy="144" r="7" fill="url(#gM)" ${G}/>`+paul+helmF(e);
  return s;
}

/* ===== Szikkadt Szilárd ===== */
const szHood=(v,e)=>{const ey=e==='angry'?GL(100,64,12,'#ff2a1a',.55)+Y(92,64,'#ff2a1a',8,-1.4)+Y(108,64,'#ff2a1a',8,1.4):e==='grin'?GL(100,64,9,'#ff2a1a',.4)+B('M88 65 Q92 61 96 64 M104 64 Q108 61 112 65',2.6,'#ff3a2a')+B('M88 65 Q92 61 96 64 M104 64 Q108 61 112 65',1,'#fff',.8):Y(92,64,'#ff2a1a',6,-.5)+Y(108,64,'#ff2a1a',6,.5);
  if(v==='s') return P('M78 102 Q70 40 104 20 Q130 32 130 70 L126 90 Q114 84 106 94Z','url(#gCo)')+B('M80 100 Q74 42 104 22 Q128 34 128 70 L124 88',2,'#c42a20')+P('M112 48 Q126 54 126 76 L114 88 Q106 70 112 48Z','#030203')+Y(120,64,'#ff2a1a',6,-.4);
  if(v==='b') return P('M68 104 Q62 40 100 20 Q138 40 132 104 Q100 116 68 104Z','url(#gCo)')+B('M70 102 Q64 42 100 22 Q136 42 130 102',2,'#c42a20')+B('M100 24 L100 108',1.4,'#000',.4);
  return P('M68 102 Q62 40 100 20 Q138 40 132 102 Q116 90 100 92 Q84 90 68 102Z','url(#gCo)')+B('M70 100 Q64 42 100 22 Q136 42 130 100',2.2,'#c42a20')+B('M76 96 Q88 86 100 88 Q112 86 124 96',1.4,'#c42a20',.7)+P('M80 86 Q78 46 100 38 Q122 46 120 86 Q100 94 80 86Z','#030203')+ey;};
function szl(v='f',e='smirk'){
  let s=S(100,60,288);
  const tat=(top,l,r,bot)=>`M${l+6} ${top} Q${l-14} 190 ${l-20} ${bot} L${l-6} ${bot-12} L${l} ${bot+4} L${l+14} ${bot-10} L${l+22} ${bot+2} L${l+34} ${bot-14} L100 ${bot-2} L${r-34} ${bot-14} L${r-22} ${bot+2} L${r-14} ${bot-10} L${r} ${bot+4} L${r+6} ${bot-12} L${r+20} ${bot} Q${r+14} 190 ${r-6} ${top}Z`;
  const coat=P(tat(94,68,132,280),'url(#gCo)')+B('M50 270 L62 262 M138 262 L150 270',2,'#c42a20');
  const hairBack=P('M76 60 Q76 44 100 44 Q124 44 124 60 L134 132 L122 118 L120 142 L108 114 L92 114 L80 142 L78 118 L66 132Z','url(#gHs)')+B('M84 60 Q80 100 82 136 M118 60 Q122 100 120 136',1,'#6e7080',.6);
  const body=()=>legs('#141018',11,'#1a1014')+B('M80 262 L94 262 M106 262 L120 262',2,'#c42a20')+P('M82 96 L118 96 L120 158 L80 158Z','#1a1418')+B('M84 104 L116 150 M116 104 L84 150',1.6,'#4a2a2a')+P('M100 100 L107 110 L100 122 L93 110Z','url(#gC)')+GL(100,110,7,'#ff3a2a',.8)+P('M78 150 L122 150 L122 160 L78 160Z','#2a1a1a')+`<circle cx="100" cy="155" r="5" fill="url(#gC)" ${G}/>`+P('M70 92 L84 98 L82 160 L72 250 Q62 200 64 150Z','url(#gCo)')+P('M130 92 L116 98 L118 160 L128 250 Q138 200 136 150Z','url(#gCo)')+B('M82 100 L80 160 L72 246 M118 100 L120 160 L128 246',2.2,'#c42a20')+[[78,160],[76,170],[74,180],[74,190],[76,200],[80,208]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="3.6" fill="none" stroke="#9aa3ae" stroke-width="1.8"/>`).join('')+P('M76 80 L90 92 L100 96 L110 92 L124 80 L128 98 L100 106 L72 98Z','#140e12')+B('M78 84 L100 100 L122 84',1.6,'#c42a20')+P('M62 92 Q76 80 92 90 L88 108 L64 116Z M138 92 Q124 80 108 90 L112 108 L136 116Z','url(#gCo)')+B('M64 114 L88 106 M136 114 L112 106',1.6,'#c42a20');
  if(v==='b'){
    s+=body()+coat+P('M100 140 L112 168 L100 160 L88 168Z','#c42a20','opacity=".8"')+P('M64 100 L50 160 L60 168 L74 132Z M136 100 L150 160 L140 168 L126 132Z','url(#gCo)');
    s+=P('M76 90 L64 140 L80 124 L84 150 L96 120 L104 120 L116 150 L120 124 L136 140 L124 90Z','url(#gHs)')+B('M90 100 Q86 120 90 140 M110 100 Q114 120 110 140',1,'#6e7080',.6)+szHood('b',e);
    return s;
  }
  if(v==='s'){
    s+=sideBody(coat+body())+P('M90 90 L84 128 L96 112 L100 96Z','url(#gHs)')+szHood('s',e);
    s+=P('M108 100 L130 120 L144 110 L146 116 L132 132 L104 124Z','url(#gCo)')+`<circle cx="146" cy="112" r="4.4" fill="url(#gSk)" ${G}/>`+GL(150,108,8,'#ff3a2a',.6);
    return s;
  }
  s+=coat+hairBack+body();
  s+=P('M64 100 Q48 104 34 96 L30 102 Q46 116 72 124Z','url(#gCo)')+B('M34 96 L30 102',2,'#c42a20')+`<circle cx="28" cy="96" r="5" fill="url(#gSk)" ${G}/>`;
  s+=GL(24,82,16,'#ff3a2a',.4)+`<circle cx="24" cy="82" r="14" fill="none" stroke="#ff4a3a" stroke-width="1.6"/><circle cx="24" cy="82" r="9" fill="none" stroke="#ff4a3a" stroke-width="1"/><polygon points="${st(24,82,13,5,6)}" fill="none" stroke="#ff8a6a" stroke-width=".8"/>`+runeTxt(24,85,'ᛉ','#ffd0c0',7);
  s+=P('M136 100 L148 156 L156 168 L138 170 L126 132Z','url(#gCo)')+`<circle cx="150" cy="166" r="4.6" fill="url(#gSk)" ${G}/>`;
  s+=szHood('f',e);
  return s;
}

/* ---------- játszható karakterek (a beküldött lapok alapján) ---------- */
DEFS+=(gr('gHb','#7a5034','#4a2e1c','#2a1a10')+gr('gHk','#3a3640','#16141a','#08070a')+gr('gHy','#ffe9a8','#e0b860','#9a7430')+gr('gNv','#3a4ea8','#1e2a70','#0e143a')+gr('gGy','#a8a294','#77715f','#45413a')+gr('gTl','#5ad8e0','#1a8aa8')+gr('gGn','#5a9a44','#2e6226','#173614')
 +`<pattern id="camo" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#7a7a4a"/><path d="M0 6 Q8 0 16 6 Q12 14 4 12Z M22 2 Q34 0 38 10 Q30 16 24 10Z M6 22 Q18 18 22 28 Q12 34 4 30Z M26 24 Q36 20 40 30 Q34 40 26 34Z" fill="#4e5a2e"/><path d="M14 14 Q22 12 24 18 Q18 22 14 20Z M30 14 Q36 14 36 20 L30 20Z M0 34 Q8 32 10 38 L0 40Z M16 32 Q22 30 24 36 Q18 40 16 38Z" fill="#5a4630"/><path d="M8 0 L12 0 L10 4Z M34 34 L38 36 L34 38Z M18 8 L20 10 L18 12Z" fill="#c9b98a"/></pattern>`);
const hairF=(f,s=0)=>P('M82 60 Q78 26 100 24 Q122 26 118 60 L116 50 L113 56 L108 42 L104 52 L99 40 L95 52 L90 42 L87 56 L84 50Z',f)+P('M84 50 L79 62 L87 58Z M116 50 L121 62 L113 58Z',f)+P(s?'M86 32 Q90 18 98 26 Q102 14 108 26 Q116 20 116 34 Q100 26 86 32Z':'M88 30 Q94 20 100 26 Q106 20 112 30 Q100 26 88 30Z',f);
const hairB=f=>P('M82 62 Q76 24 100 22 Q124 24 118 62 L112 70 L106 62 L100 72 L94 62 L88 70Z',f)+P('M88 30 Q94 18 100 24 Q108 16 114 30 Q100 24 88 30Z',f);
const hairS=f=>P('M86 60 Q80 24 102 22 Q122 26 120 46 L114 42 L112 52 L104 44 L98 56 L92 50 L90 68Z',f)+P('M94 28 Q100 16 108 22 Q116 20 114 30Z',f);
const neck=`<rect x="94" y="74" width="12" height="10" fill="url(#gSk)"/>`;
const glove=(x,y,c='#5a3a24')=>`<circle cx="${x}" cy="${y}" r="4.8" fill="${c}" ${G}/>`;
const flag=(x,y)=>`<g transform="translate(${x} ${y})"><rect width="9" height="2.4" fill="#c8302a"/><rect y="2.4" width="9" height="2.4" fill="#fff"/><rect y="4.8" width="9" height="2.4" fill="#3a8a3a"/><rect width="9" height="7.2" fill="none" stroke="${O}" stroke-width=".8"/></g>`;
const goldDrop=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -8 Q6 -1 6 3 A6 6 0 0 1 -6 3 Q-6 -1 0 -8Z" fill="url(#gL)" stroke="#7a5410" stroke-width="1"/></g>`;

/* Gergő, a HGWS-től */
function pGh(v='f',e='calm'){
  let s=S(100,60,288);
  const stars=[[60,200],[72,240],[132,210],[146,250],[56,260],[140,170],[66,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1" fill="#ffe9a0"/>`).join('');
  const cloak=P('M64 92 Q46 190 40 284 L160 284 Q154 190 136 92Z','url(#gNv)')+B('M42 282 L158 282',2.4,'#d8a030')+stars;
  const staff=L('M58 290 Q54 200 60 120 Q64 80 60 40','url(#gW)',4)+P('M54 36 L66 36 L66 22 L54 22Z','url(#gL)')+P('M40 24 L80 18 L80 24 L40 30Z','url(#gL)')+`<circle cx="60" cy="22" r="5" fill="url(#gL)" ${G}/>`+P('M78 16 L86 12 L84 22Z','url(#gL)')+GL(60,24,16,'#fff0a0',.55)+[[42,12],[84,34],[36,40],[76,4]].map(([x,y])=>`<polygon points="${st(x,y,3.4,1,4)}" fill="#ffe9a0"/>`).join('');
  const body=()=>legs('#1a1a22',11,'#4a2e1c')+P('M80 92 L120 92 L122 152 L78 152Z','#18181e')+P('M90 90 L100 102 L110 90 L108 96 L100 104 L92 96Z','#24242c')+`<path d="M110 106 Q114 112 114 115 A4 4 0 0 1 106 115 Q106 112 110 106Z" fill="#4fb7ff"/>`+P('M78 146 L122 146 L122 156 L78 156Z','#5a3a24')+`<rect x="96" y="145" width="8" height="12" fill="none" stroke="#c4c8d0" stroke-width="1.6"/>`+P('M110 156 L124 156 L124 172 L110 172Z M76 156 L86 156 L86 168 L76 168Z','#6a4a2e')+P('M68 92 L84 96 L82 152 L74 260 Q62 200 64 150Z','url(#gNv)')+P('M132 92 L116 96 L118 152 L126 260 Q138 200 136 150Z','url(#gNv)')+B('M84 98 L82 152 L74 256 M116 98 L118 152 L126 256',2.2,'#d8a030')+P('M76 84 Q100 72 124 84 L120 94 L80 94Z','url(#gNv)')+B('M80 90 Q100 80 120 90',1.6,'#d8a030')+`<circle cx="84" cy="94" r="2.6" fill="url(#gL)"/><circle cx="116" cy="94" r="2.6" fill="url(#gL)"/>`;
  if(v==='b') return s+body()+cloak+P('M76 84 Q100 60 124 84 L120 110 Q100 116 80 110Z','url(#gNv)')+B('M78 86 Q100 64 122 86',2,'#d8a030')+hairB('url(#gHb)')+`<g transform="translate(84 0)">${staff}</g>`;
  if(v==='s') return s+sideBody(cloak+body())+prof(103,58,{e,iris:'#7a5a3a',brow:'#3a2618'})+hairS('url(#gHb)')+P('M104 98 L122 140 L114 148 L98 124Z','url(#gNv)')+glove(118,146)+`<g transform="translate(60 0)">${staff}</g>`;
  return s+cloak+body()+staff+P('M68 98 L54 136 L64 144 L80 120Z','url(#gNv)')+glove(60,140)+P('M132 98 L144 160 L134 166 L124 128Z','url(#gNv)')+glove(140,166)+neck+face(100,58,{e,iris:'#7a5a3a',brow:'#3a2618'})+`<g fill="#6a4a3a" opacity=".55">${[[92,72],[96,75],[100,76],[104,75],[108,72],[90,68],[110,68]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".7"/>`).join('')}</g>`+hairF('url(#gHb)');
}
function legsOf(){} // (helyfoglaló a jövőbeli finomításhoz)

/* Gyakornok Relé */
function pRl(v='f',e='calm'){
  let s=S(100,60,288);
  const coat=P('M66 94 Q46 190 40 280 L66 272 L80 284 L100 270 L120 284 L134 272 L160 280 Q154 190 134 94Z','url(#gGy)')+B('M48 230 L56 222 L60 232 M146 226 L140 236 L150 240 M52 260 L60 254',1.6,'#d8a030',.9);
  const body=()=>L('M90 156 L88 252','#4a3e30',13)+L('M110 156 L112 252','#4a3e30',13)+P('M80 236 L96 236 L96 254 L80 254Z M104 236 L120 236 L120 254 L104 254Z','#6a5a44')+P('M80 254 L97 254 L98 286 L76 288Z M103 254 L120 254 L124 288 L102 286Z','#1e1a18')+B('M80 270 L97 270 M103 270 L121 270',2,'#d8a030')+P('M84 94 L116 94 L118 152 L82 152Z','#6a5a44')+B('M88 100 L112 140 M112 100 L88 140',1.4,'#3a2e22')+B('M86 110 Q78 130 84 150 M114 110 Q122 132 116 150',2,'#c42a20')+`<rect x="92" y="104" width="16" height="14" rx="2" fill="#3a3a44" ${G}/><rect x="95" y="107" width="10" height="8" fill="#4fb7ff"/>`+GL(100,111,6,'#4fb7ff',.6)+P('M78 144 L122 144 L122 154 L78 154Z','#5a3a24')+`<rect x="106" y="150" width="14" height="18" rx="2" fill="#8a8478" ${G}/><rect x="109" y="154" width="8" height="8" fill="#4fb7ff"/>`+P('M70 92 L86 96 L84 150 L76 250 Q64 200 66 150Z','url(#gGy)')+P('M130 92 L114 96 L116 150 L124 250 Q136 200 134 150Z','url(#gGy)')+B('M84 100 L82 150 M116 100 L118 150',1.6,'#d8a030')+P('M74 84 Q100 72 126 84 L124 100 Q100 92 76 100Z','url(#gGy)');
  const gog=(x)=>`<circle cx="${x-7}" cy="40" r="5.4" fill="#9ad8ff" ${G}/><circle cx="${x+7}" cy="40" r="5.4" fill="#9ad8ff" ${G}/>`+R(x-8,38,2,1.4,.8)+R(x+6,38,2,1.4,.8);
  if(v==='b') return s+body()+coat+`<g transform="translate(100 150)">${B('M0 -30 L0 30 M-14 -20 L14 -20 M-10 -6 L10 -6 M-14 8 L14 8 M-6 20 L6 20',3,'#1e1a18')}</g>`+P('M72 84 Q100 62 128 84 L124 108 Q100 116 76 108Z','url(#gGy)')+hairB('url(#gHb)')+B('M80 42 L120 42',3,'#5a3a24');
  if(v==='s') return s+sideBody(coat+body())+prof(103,58,{e,iris:'#c8902a',brow:'#3a2618'})+hairS('url(#gHb)')+`<circle cx="108" cy="40" r="5.4" fill="#9ad8ff" ${G}/>`+B('M86 42 L103 40',3,'#5a3a24')+P('M104 98 L120 140 L112 146 L98 124Z','url(#gGy)')+glove(116,144,'#2a2420');
  return s+coat+body()+P('M68 100 L50 138 L60 146 L78 122Z','url(#gGy)')+glove(54,142,'#2a2420')+GL(34,124,12,'#4fb7ff',.55)+`<g transform="rotate(18 34 124)"><rect x="25" y="115" width="18" height="18" rx="2" fill="#2a5ab8" ${G}/><rect x="29" y="119" width="10" height="10" fill="none" stroke="#bfe8ff" stroke-width="1.4"/></g>`+P('M132 100 L144 158 L134 164 L124 128Z','url(#gGy)')+glove(140,162,'#2a2420')+neck+face(100,58,{e,iris:'#c8902a',brow:'#3a2618'})+hairF('url(#gHb)',1)+B('M80 42 L120 42',3,'#5a3a24')+gog(100);
}

/* Gergő, a Biztonsági Körök Őre */
function pGt(v='f',e='calm'){
  let s=S(100,60,288);
  const cape=P('M64 92 Q44 190 40 280 L160 280 Q156 190 136 92Z','url(#gNv)')+B('M42 278 L158 278',2.4,'#d8a030');
  const btn=`<rect x="40" y="142" width="18" height="12" rx="2" fill="#e8c030" ${G}/><ellipse cx="49" cy="142" rx="8" ry="4" fill="#d8342a" ${G}/>`+GL(49,140,8,'#ff3a2a',.6);
  const body=()=>legs('#141418',10,'url(#gNv)')+P('M80 206 L94 206 L92 226 L80 226Z M106 206 L120 206 L120 226 L108 226Z','url(#gM)')+B('M80 262 L96 262 M104 262 L122 262',1.6,'#d8a030')+P('M80 92 L120 92 L124 196 L76 196Z','#f0f0f4')+P('M80 92 L94 92 L90 196 L76 196Z M120 92 L106 92 L110 196 L124 196Z','#1c2450')+B('M94 92 L90 196 M106 92 L110 196',1.6,'#d8a030')+P('M76 140 L124 150 L124 158 L76 148Z M76 156 L124 146 L124 154 L76 164Z','#5a3a24')+P('M110 160 L122 160 L122 176 L110 176Z','#6a4a2e')+`<circle cx="100" cy="104" r="8" fill="url(#gL)" ${G}/><circle cx="100" cy="104" r="5" fill="url(#gC)"/>`+GL(100,104,6,'#ff3a2a',.5)+P('M78 80 L88 92 L100 96 L112 92 L122 80 L124 96 L100 100 L76 96Z','#1c2450')+B('M80 84 L100 96 L120 84',1.4,'#d8a030')+P('M62 92 Q74 80 90 88 L88 108 L64 114Z M138 92 Q126 80 110 88 L112 108 L136 114Z','url(#gM)')+`<path d="M76 92 Q80 98 80 100 A4 4 0 0 1 72 100 Q72 98 76 92Z M124 92 Q128 98 128 100 A4 4 0 0 1 120 100 Q120 98 124 92Z" fill="#4fb7ff"/>`;
  if(v==='b') return s+body()+cape+`<path d="M100 150 Q114 170 114 180 A14 14 0 0 1 86 180 Q86 170 100 150Z" fill="url(#gA)" stroke="#d8a030" stroke-width="1.6"/>`+B('M70 260 L80 240 L84 262 M130 260 L120 240 L116 262',1.6,'#7ad8ff')+P('M62 92 Q74 80 90 88 L88 108 L64 114Z M138 92 Q126 80 110 88 L112 108 L136 114Z','url(#gM)')+hairB('url(#gHy)');
  if(v==='s') return s+sideBody(cape+body())+prof(103,58,{e,iris:'#3a8ad8',brow:'#9a7430'})+hairS('url(#gHy)')+P('M104 98 L120 140 L112 146 L98 124Z','#1c2450')+glove(116,144,'#1a1a1a');
  return s+cape+body()+P('M68 100 L54 140 L64 146 L80 122Z','#1c2450')+btn+glove(52,150,'#1a1a1a')+P('M132 100 L146 126 L132 146 L124 130 L132 124 L124 112Z','#1c2450')+glove(130,146,'#1a1a1a')+neck+face(100,58,{e,iris:'#3a8ad8',brow:'#9a7430'})+hairF('url(#gHy)',1);
}

/* Kitty */
function pKt(v='f',e='smirk'){
  let s=S(100,56,288);
  const tail=P('M108 30 Q140 40 134 90 Q130 130 140 170 Q120 150 118 110 Q116 70 104 40Z','url(#gHb)');
  const coat=P('M66 92 Q44 190 40 280 L160 280 Q156 190 134 92Z','url(#gNv)')+P('M50 250 L60 280 L40 280Z M150 250 L140 280 L160 280Z','url(#gTl)')+B('M56 200 L66 214 L60 230 M144 200 L136 216 L142 230',1.6,'#7af0ff');
  const body=()=>L('M90 170 L90 186','url(#gSk)',9)+L('M110 170 L110 186','url(#gSk)',9)+L('M90 186 L89 252','#1e1e2a',9)+L('M110 186 L111 252','#1e1e2a',9)+P('M82 246 L97 246 L96 286 L86 288 L80 284Z M103 246 L118 246 L120 284 L114 288 L104 286Z','url(#gNv)')+B('M83 256 L96 256 M104 256 L117 256',1.6,'#c4c8d0')+P('M84 140 L116 140 L122 176 L78 176Z','#1c2450')+P('M94 140 L106 140 L106 176 L94 176Z','#ecE8f2')+P('M84 94 L116 94 L118 142 L82 142Z','#1c2450')+P('M92 94 L108 94 L104 120 L96 120Z','#f0f0f4')+P('M80 138 L120 138 L120 146 L80 146Z','#5a3a24')+`<circle cx="100" cy="142" r="5" fill="url(#gL)" ${G}/>`+P('M112 146 L122 146 L122 160 L112 160Z','#6a4a2e')+`<path d="M100 98 Q104 104 104 106 A4 4 0 0 1 96 106 Q96 104 100 98Z" fill="#5ad8e0"/>`+P('M70 92 L86 96 L84 150 L76 252 Q62 200 66 150Z','url(#gNv)')+P('M130 92 L114 96 L116 150 L124 252 Q138 200 134 150Z','url(#gNv)')+B('M84 98 L82 150 L76 248 M116 98 L118 150 L124 248',2,'#5ad8e0')+P('M78 82 L90 92 L100 96 L110 92 L122 82 L124 96 L100 102 L76 96Z','#1c2450')+B('M80 86 L100 98 L120 86',1.4,'#d8a030');
  const hairFront=P('M82 60 Q80 30 100 28 Q120 30 118 60 L120 84 L114 70 L112 56 L106 42 L100 54 L94 42 L88 56 L86 72 L80 84Z','url(#gHb)')+`<rect x="104" y="24" width="7" height="5" rx="2" fill="url(#gTl)" ${G}/>`;
  if(v==='b') return s+body()+coat+`<path d="M100 150 Q112 166 112 176 A12 12 0 0 1 88 176 Q88 166 100 150Z" fill="url(#gA)" stroke="#d8a030" stroke-width="1.6"/>`+B('M100 190 L90 220 M100 190 L110 220',2,'#d8a030')+P('M82 62 Q78 26 100 24 Q122 26 118 62 L116 90 L84 90Z','url(#gHb)')+P('M94 24 Q90 60 100 120 Q108 150 96 180 Q120 160 114 110 Q108 60 106 24Z','url(#gHb)')+`<rect x="96" y="20" width="10" height="6" rx="2" fill="url(#gTl)" ${G}/>`;
  if(v==='s') return s+sideBody(coat+body())+P('M98 28 Q70 40 74 100 Q76 140 66 170 Q90 150 90 106 Q92 60 104 36Z','url(#gHb)')+prof(103,58,{e,iris:'#2ab8d8',brow:'#3a2618'})+P('M86 58 Q82 26 102 24 Q120 28 120 48 L112 44 L108 56 L100 46 L94 60 L90 76Z','url(#gHb)')+`<circle cx="98" cy="66" r="2" fill="#5ad8e0"/>`;
  return s+tail+coat+body()+P('M68 100 L58 132 L74 146 L80 122Z','url(#gNv)')+glove(76,146,'#1c2450')+P('M132 100 L144 156 L134 162 L124 128Z','url(#gNv)')+glove(140,162,'#1c2450')+`<g fill="none" stroke="#5ad8e0" stroke-width="2.4" opacity=".85"><path d="M150 176 Q170 160 160 140 Q150 128 162 116"/><path d="M146 168 Q160 158 154 146"/></g>`+GL(158,150,10,'#5ad8e0',.4)+neck+face(100,58,{e,iris:'#2ab8d8',brow:'#3a2618'})+hairFront+`<path d="M85 70 L84 76 L86 76Z M115 70 L116 76 L114 76Z" fill="#5ad8e0" stroke="#1a5a7a" stroke-width=".6"/>`;
}

/* Zero */
function pZr(v='f',e='calm'){
  let s=S(100,60,288);
  const cape=P('M66 92 Q50 190 46 270 L154 270 Q150 190 134 92Z','url(#gGn)');
  const broom=L('M60 210 L134 20','url(#gW)',3)+P('M128 30 L150 2 L160 14 L138 38Z','url(#gL)')+B('M132 34 L156 6 M136 36 L158 10',1,'#a87420')+GL(146,18,14,'#ffe9a0',.6);
  const body=()=>L('M90 160 L88 250','url(#camo)',13)+L('M110 160 L112 250','url(#camo)',13)+P('M80 200 L96 200 L96 218 L80 218Z M104 200 L120 200 L120 218 L104 218Z','url(#gT)')+P('M80 232 L96 232 L96 262 L80 262Z M104 232 L120 232 L120 262 L104 262Z','url(#gT)')+P('M78 262 L98 262 L99 286 L74 288Z M102 262 L122 262 L126 288 L101 286Z','#5a4632')+P('M78 92 L122 92 L124 160 L76 160Z','url(#camo)')+P('M82 96 L118 96 L116 140 L84 140Z','url(#gT)')+B('M84 118 L116 118 M86 130 L114 130',1.4,'#4a453e')+goldDrop(100,108,1.3)+`<circle cx="100" cy="108" r="10" fill="none" stroke="#a87420" stroke-width="1.6"/>`+P('M76 146 L124 146 L124 154 L76 154Z','#5a3a24')+`<rect x="96" y="145" width="8" height="10" fill="none" stroke="#c4c8d0" stroke-width="1.6"/>`+P('M60 90 Q72 78 90 86 L88 110 L62 114Z M140 90 Q128 78 110 86 L112 110 L138 114Z','url(#gT)')+flag(122,96)+P('M76 84 Q100 70 124 84 L120 96 L80 96Z','url(#gGn)');
  const ak=`<g transform="rotate(-18 100 150)">${P('M44 146 L70 140 L74 152 L48 158Z','#7a4a24')}${P('M70 140 L120 140 L120 152 L70 152Z','#3a3a40')}${P('M120 142 L160 142 L160 148 L120 148Z','#2a2a30')}${P('M84 140 L116 138 L116 142 L84 144Z','#7a4a24')}${P('M160 140 L170 140 L170 150 L160 150Z','url(#gL)')}${P('M92 152 Q96 172 86 186 L96 188 Q108 172 102 152Z','url(#gA)')}${GL(96,170,8,'#4fb7ff',.7)}</g>`;
  if(v==='b') return s+body()+cape+`<g transform="translate(-6 30)">${broom}</g>`+hairB('url(#gHk)')+P('M76 84 Q100 64 124 84 L120 104 Q100 110 80 104Z','url(#gGn)');
  if(v==='s') return s+broom+sideBody(cape+body())+prof(103,58,{e,iris:'#6a6a70',brow:'#16141a',glasses:1})+hairS('url(#gHk)')+P('M104 98 L120 140 L112 146 L98 124Z','url(#camo)')+glove(116,144,'#5a4632')+`<g transform="translate(30 6) scale(.8)">${ak}</g>`;
  return s+broom+cape+body()+P('M68 100 L60 134 L74 146 L80 122Z','url(#camo)')+glove(74,146,'#e8c8b0')+P('M132 100 L142 140 L130 150 L124 128Z','url(#camo)')+glove(132,150,'#e8c8b0')+L('M62 180 Q40 200 54 220 Q70 230 88 196','#6a5a44',2)+`<rect x="56" y="172" width="12" height="22" rx="3" fill="#bfe8ff" fill-opacity=".8" ${G}/>`+ak+neck+face(100,58,{e,iris:'#6a6a70',brow:'#16141a',glasses:1})+hairF('url(#gHk)',1);
}

/* Botond */
function pBt(v='f',e='smile'){
  let s=S(100,60,288);
  const tank=`<rect x="70" y="78" width="60" height="78" rx="10" fill="url(#gM)" ${G}/><rect x="78" y="96" width="44" height="40" rx="4" fill="url(#gA)" ${G}/>`+GL(100,116,14,'#4fb7ff',.5)+`<rect x="84" y="70" width="12" height="10" rx="2" fill="#5a5f68" ${G}/>`;
  const helm=P('M80 50 Q80 24 100 22 Q120 24 120 50 L124 54 L76 54Z','url(#camo)')+B('M78 52 L122 52',3,'#3a4a24')+B('M82 54 L84 72 M118 54 L116 72',1.6,'#3a4a24');
  const pkm=`${P('M100 150 L170 154 L170 162 L100 160Z','#2a2a30')}${P('M100 146 L134 146 L134 162 L100 162Z','#3a3a40')}${P('M78 146 L102 148 L102 160 L80 166Z','#7a4a24')}${P('M170 152 L180 152 L180 164 L170 164Z','url(#gL)')}${P('M106 162 L132 162 L130 184 L108 184Z','url(#gA)')}${GL(118,172,9,'#4fb7ff',.7)}${[0,1,2,3].map(i=>`<rect x="${110+i*5}" y="142" width="3" height="6" fill="url(#gL)"/>`).join('')}<g fill="#7ad8ff"><circle cx="186" cy="158" r="2"/><circle cx="190" cy="152" r="1.4"/><circle cx="188" cy="166" r="1.6"/></g>`;
  const body=()=>L('M90 160 L88 250','url(#camo)',14)+L('M110 160 L112 250','url(#camo)',14)+P('M78 250 L98 250 L99 286 L74 288Z M102 250 L122 250 L126 288 L101 286Z','#6a5a44')+B('M80 262 L96 262 M80 270 L96 270 M104 262 L120 262 M104 270 L120 270',1.2,'#3a2e22')+P('M76 92 L124 92 L126 160 L74 160Z','url(#camo)')+P('M92 92 L100 104 L108 92Z','#4e5a2e')+B('M82 94 L86 160 M118 94 L114 160',3,'#3a4a24')+goldDrop(110,112,1)+P('M76 146 L124 146 L124 154 L76 154Z','#5a3a24')+P('M60 90 Q72 80 90 88 L88 112 L62 116Z M140 90 Q128 80 110 88 L112 112 L138 116Z','url(#camo)')+flag(124,98);
  if(v==='b') return s+body()+tank+L('M124 140 Q150 160 140 200 Q130 230 110 220','url(#gGn)',3)+P('M78 62 Q78 30 100 28 Q122 30 122 62Z','#2a1a10')+helm;
  if(v==='s') return s+sideBody(body())+`<g transform="translate(-34 0) scale(.9 1)">${tank}</g>`+L('M70 150 Q58 190 80 210 Q100 220 110 180','url(#gGn)',3)+prof(103,60,{e,iris:'#6a4a2a',brow:'#2a1a10'})+helm+P('M104 98 L120 140 L112 146 L98 124Z','url(#camo)')+`<g transform="translate(-10 -6) scale(.8)">${pkm}</g>`;
  return s+tank+body()+L('M74 140 Q40 170 50 210 Q60 240 96 220 Q108 200 110 184','url(#gGn)',3)+P('M68 100 L64 140 L82 152 L84 126Z','url(#camo)')+glove(84,152,'#e8c8b0')+P('M132 100 L140 140 L124 154 L120 128Z','url(#camo)')+pkm+glove(126,154,'#e8c8b0')+neck+face(100,60,{e,iris:'#6a4a2a',brow:'#2a1a10'})+helm;
}

/* ---------- Szikkadt Szilárd, az Aszály Istene (finálé) ---------- */
DEFS+=(gr('gOb','#4a3a30','#241a14','#0c0806')+gr('gMask','#fff4c8','#e8b84a','#a8741a')+`<radialGradient id="gSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".78" stop-color="#140604"/><stop offset=".9" stop-color="#ff6a1a"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient><radialGradient id="gHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb04a" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>`);
const sunHalo=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r*1.6}" fill="url(#gHeat)"/>`+`<polygon points="${st(x,y,r*1.55,r*1.05,18)}" fill="url(#gF)" opacity=".9" ${G}/>`+`<circle cx="${x}" cy="${y}" r="${r*1.08}" fill="url(#gSun)"/>`+`<circle cx="${x}" cy="${y}" r="${r}" fill="#080303" stroke="#ff8a2a" stroke-width="2"/>`+`<circle cx="${x}" cy="${y}" r="${r*1.32}" fill="none" stroke="#d8a030" stroke-width="1.2" stroke-dasharray="3 5"/>`+[...Array(8)].map((_,i)=>{const a=i*.785;return runeTxt((x+Math.cos(a)*r*1.32).toFixed(1),(y+Math.sin(a)*r*1.32+2).toFixed(1),'ᛊᛏᚾᛞᚷᛟᚱᛉ'[i],'#ffd27a',6)}).join('');
const wing=(k)=>[0,1,2,3].map(i=>{const a=(k<0?Math.PI:0)+k*(-.32-i*.36),L=98-i*12,bx=100+k*16,by=104+i*8,tx=bx+Math.cos(a)*L,ty=by+Math.sin(a)*L,px=-Math.sin(a)*7,py=Math.cos(a)*7;return P(`M${bx} ${by} L${(tx+px).toFixed(1)} ${(ty+py).toFixed(1)} L${(tx+Math.cos(a)*14).toFixed(1)} ${(ty+Math.sin(a)*14).toFixed(1)} L${(tx-px).toFixed(1)} ${(ty-py).toFixed(1)}Z`,'url(#gOb)')+B(`M${bx} ${by} L${(tx+Math.cos(a)*8).toFixed(1)} ${(ty+Math.sin(a)*8).toFixed(1)}`,1.6,'#ff8a2a',.9)+B(`M${(bx+tx)/2} ${(by+ty)/2} l${(px*.8).toFixed(1)} ${(py*.8).toFixed(1)}`,1.2,'#ff8a2a',.7)}).join('');
const mask=(e,side)=>{ if(side) return P('M108 44 Q124 46 124 66 Q122 82 110 86 Q104 70 108 44Z','url(#gMask)')+Y(117,62,'#ff2a1a',6,-.4)+B('M112 50 L116 58 L113 66',1,'#5a3a10');
  let s=P('M86 44 Q100 36 114 44 Q118 64 112 80 Q100 90 88 80 Q82 64 86 44Z','url(#gMask)')+B('M100 38 L98 52 L103 60 L99 72 M90 50 L94 56 M110 70 L106 76',1.1,'#5a3a10');
  if(e==='angry') s+=GL(100,60,14,'#ff2a1a',.6)+Y(93,60,'#ff2a1a',9,-1.6)+Y(107,60,'#ff2a1a',9,1.6)+B('M100 38 L98 52 L103 60 L99 72',1.6,'#ff6a1a');
  else if(e==='grin') s+=Y(93,60,'#ff2a1a',7,-.8)+Y(107,60,'#ff2a1a',7,.8)+P('M92 72 Q100 80 108 72 L104 76 L100 74 L96 76Z','#ff7a1a')+GL(100,74,6,'#ffb04a',.8);
  else s+=Y(93,60,'#ff2a1a',6,-.5)+Y(107,60,'#ff2a1a',6,.5);
  return s;};
const crown=(side)=>side?P('M100 34 L102 14 L108 30 L114 8 L118 30 L124 18 L124 38Z','url(#gOb)')+`<circle cx="114" cy="10" r="2" fill="#ffd27a"/>`:[[-26,22],[-18,14],[-8,6],[0,0],[8,6],[18,14],[26,22]].map(([dx,dy],i)=>P(`M${100+dx-4} ${40-dy*.2} L${100+dx*1.15} ${18-dy*.8+(i%2?6:0)} L${100+dx+4} ${40-dy*.2}Z`,'url(#gOb)')+`<circle cx="${(100+dx*1.15).toFixed(1)}" cy="${(18-dy*.8+(i%2?6:0)).toFixed(1)}" r="1.8" fill="#ffd27a"/>`).join('');
function god(v='f',e='calm',scale=0){
  let s='';
  const vortex=P('M70 206 Q58 244 84 266 Q96 278 100 298 Q104 278 116 266 Q142 244 130 206Z','url(#gS)','opacity=".5"')+[[-1,0],[1,0],[-1,1],[1,1]].map(([k,j])=>`<path d="M${100+k*(18+j*10)} 210 Q${100+k*(50+j*14)} ${240+j*10} ${100+k*(22+j*6)} ${266+j*8} Q${100+k*6} ${284} ${100+k*(30+j*20)} ${298}" stroke="#e8c88a" stroke-width="${4-j*1.6}" fill="none" opacity="${.7-j*.25}" stroke-linecap="round"/>`).join('')+B('M78 222 Q100 236 122 222 M84 246 Q100 256 116 246 M92 268 Q100 274 108 268',1.4,'#a87c42',.8)+`<g fill="#e8c88a" opacity=".85">${[[56,236],[144,244],[62,266],[138,272],[80,292],[120,288],[46,214],[154,220],[70,250],[130,256]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>`;
  const robe=P('M74 104 Q62 150 58 214 L70 206 L76 224 L88 208 L100 228 L112 208 L124 224 L130 206 L142 214 Q138 150 126 104Z','url(#gOb)')+P('M92 104 L108 104 L112 200 L88 200Z','url(#gC)')+B('M94 110 L92 196 M106 110 L108 196',1.4,'#d8a030')+B('M60 212 L70 204 L76 220 L88 206 L100 224 L112 206 L124 220 L130 204 L140 212',2,'#d8a030')+B('M78 130 L86 150 L80 172 M122 128 L114 152 L120 176',1.6,'#ff8a2a',.8)+GL(100,128,12,'#ff8a2a',.8)+`<polygon points="${st(100,128,10,4,8)}" fill="url(#gF)" ${G}/><circle cx="100" cy="128" r="4" fill="#fff4c8"/>`;
  const pauls=P('M60 104 Q70 88 92 96 L90 116 L62 122Z M140 104 Q130 88 108 96 L110 116 L138 122Z','url(#gL)')+`<polygon points="${st(72,104,8,4,8)}" fill="#ffe9a0" opacity=".8"/><polygon points="${st(128,104,8,4,8)}" fill="#ffe9a0" opacity=".8"/>`;
  const hoodF=P('M66 100 Q58 40 100 24 Q142 40 134 100 Q118 86 100 88 Q82 86 66 100Z','url(#gCo)')+B('M68 98 Q60 42 100 26 Q140 42 132 98',2.4,'#d8a030')+P('M80 84 Q78 44 100 36 Q122 44 120 84 Q100 94 80 84Z','#050202');
  const staff=L('M30 280 L36 30','url(#gL)',4)+sunHalo(36,24,10);
  const chains=[[56,170],[52,180],[50,190],[150,166],[154,176]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="3.8" fill="none" stroke="#9aa3ae" stroke-width="1.8"/>`).join('');
  if(v==='b'){ s+=sunHalo(100,70,44)+wing(-1)+wing(1)+vortex+P('M70 104 Q62 150 64 200 L136 200 Q138 150 130 104Z','url(#gOb)')+B('M100 110 L100 196',1.6,'#ff8a2a',.7)+pauls+P('M64 100 Q56 40 100 22 Q144 40 136 100 Q100 116 64 100Z','url(#gCo)')+B('M66 98 Q58 42 100 24 Q142 42 134 98',2.4,'#d8a030')+crown(); return s; }
  if(v==='s'){ s+=sunHalo(96,70,40)+`<g transform="translate(100 0) scale(.5 1) translate(-100 0)">${wing(-1)}${wing(1)}</g>`+vortex+sideBody(robe+pauls)+P('M78 100 Q70 40 104 24 Q130 34 130 70 L128 96 Q116 86 106 96Z','url(#gCo)')+B('M80 98 Q72 42 104 26',2.4,'#d8a030')+mask(e,1)+crown(1)+L('M110 116 L136 150','url(#gOb)',8)+`<g transform="translate(110 0)">${staff}</g>`; return s; }
  s+=sunHalo(100,70,44)+wing(-1)+wing(1)+vortex+robe+chains+pauls;
  s+=L('M70 112 L48 92 L40 70','url(#gOb)',9)+staff+`<circle cx="40" cy="70" r="5" fill="url(#gOb)" ${G}/>`;
  s+=L('M130 112 L152 136 L162 146','url(#gOb)',9)+`<circle cx="164" cy="148" r="5" fill="url(#gOb)" ${G}/>`+GL(166,168,14,'#ff3a2a',.5)+`<ellipse cx="166" cy="170" rx="22" ry="7" fill="none" stroke="#ff4a3a" stroke-width="1.6"/><ellipse cx="166" cy="170" rx="14" ry="4.4" fill="none" stroke="#ff8a6a" stroke-width="1"/>`;
  s+=hoodF+mask(e)+crown();
  if(scale) s+=`<g transform="translate(150 246) scale(.16) translate(-100 -150)">${pGh('f','calm')}</g>`+`<text x="160" y="298" font-size="7" fill="#6a5a4a" font-family="serif" text-anchor="middle">Gergő mérete</text>`;
  return s;
}
/* ---------- Az Aszály Istene, 2. fázis: A Felszabadult Napmag ---------- */
DEFS+=(gr('gOx','#2a1a16','#120806','#040202')+gr('gMg','#fff6c8','#ff7a1a','#a81a06')+`<radialGradient id="gEc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".7" stop-color="#000"/><stop offset=".8" stop-color="#ff3a0a"/><stop offset=".88" stop-color="#ffe8a0"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient><radialGradient id="gCore" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffe27a"/><stop offset=".7" stop-color="#ff4a0a"/><stop offset="1" stop-color="#ff2a0a" stop-opacity="0"/></radialGradient>`);
const eclipse=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r*1.9}" fill="url(#gHeat)"/>`+`<polygon points="${st(x,y,r*1.75,r*1.1,24,.13)}" fill="url(#gMg)" opacity=".85" ${G}/>`+`<polygon points="${st(x,y,r*1.45,r*1.05,12,.4)}" fill="#ffe8a0" opacity=".55"/>`+`<circle cx="${x}" cy="${y}" r="${r*1.12}" fill="url(#gEc)"/>`+`<circle cx="${x}" cy="${y}" r="${r}" fill="#020101"/>`+`<circle cx="${x}" cy="${y}" r="${r*1.5}" fill="none" stroke="#ff8a2a" stroke-width="1" stroke-dasharray="1 6"/>`+[...Array(12)].map((_,i)=>{const a=i*Math.PI/6;return runeTxt((x+Math.cos(a)*r*1.5).toFixed(1),(y+Math.sin(a)*r*1.5+2).toFixed(1),'ᛊᛏᚾᛞᚷᛟᚱᛉᚦᛗᛚᛁ'[i],'#fff0b0',5.5)}).join('');
const shard=(x,y,a,l,w)=>{const c=Math.cos(a),s2=Math.sin(a),px=-s2*w,py=c*w,tx=x+c*l,ty=y+s2*l;return P(`M${(x+px).toFixed(1)} ${(y+py).toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${(x-px).toFixed(1)} ${(y-py).toFixed(1)} L${(x-c*w*.8).toFixed(1)} ${(y-s2*w*.8).toFixed(1)}Z`,'url(#gOx)')+B(`M${x.toFixed(1)} ${y.toFixed(1)} L${(x+c*l*.85).toFixed(1)} ${(y+s2*l*.85).toFixed(1)}`,1.4,'#ff6a1a',.95)+GL(tx.toFixed(1),ty.toFixed(1),3,'#ffb04a',.8)};
const brokenWing=k=>[0,1,2,3,4].map(i=>{const a=(k<0?Math.PI:0)+k*(-.25-i*.3),d0=26+i*4,bx=100+k*20+Math.cos(a)*d0,by=100+i*7+Math.sin(a)*d0;return shard(bx,by,a,62-i*7,6)+shard(bx+Math.cos(a)*(70-i*7),by+Math.sin(a)*(70-i*7),a+k*.15,22-i*2,4)}).join('');
const veins=(d,o=1)=>B(d,2.4,'#ff4a0a',.55*o)+B(d,1,'#ffe8a0',o);
function god2(v='f',e='angry'){
  let s='';
  // tűz-homok örvény alsótest
  const storm=P('M64 196 Q40 240 72 266 Q90 280 100 300 Q110 280 128 266 Q160 240 136 196Z','url(#gMg)','opacity=".55"')+P('M74 200 Q58 236 84 258 Q96 270 100 288 Q104 270 116 258 Q142 236 126 200Z','#1a0806','opacity=".85"')
    +[[-1,0],[1,0],[-1,1],[1,1],[0,2]].map(([k,j])=>`<path d="M${100+k*(16+j*12)} 204 Q${100+k*(58+j*10)} ${236+j*12} ${100+k*(20+j*8)} ${262+j*8} Q${100+k*8} 284 ${100+k*(34+j*16)} 298" stroke="${j>1?'#ffe8a0':'#ff7a1a'}" stroke-width="${3.6-j}" fill="none" opacity="${.85-j*.2}" stroke-linecap="round"/>`).join('')
    +`<g fill="#ffd27a">${[[48,226],[152,232],[56,262],[146,268],[78,292],[122,290],[38,206],[162,210],[66,244],[134,250],[90,276],[112,278]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${1.2+i%3*.6}" opacity="${.5+i%2*.4}"/>`).join('')}</g>`;
  // obszidián-test, izzó erekkel, megrepedt mellvérttel
  const torso=P('M70 100 Q58 150 64 204 L136 204 Q142 150 130 100 Q116 92 100 96 Q84 92 70 100Z','url(#gOx)')
    +veins('M80 112 L88 134 L82 156 L90 182 L86 202 M120 110 L112 136 L118 160 L110 186 L114 202 M88 134 L100 142 L112 136 M82 156 L70 170 M118 160 L132 172')
    +GL(100,140,22,'#ff6a1a',.75)+`<circle cx="100" cy="140" r="14" fill="url(#gCore)" ${G}/>`+`<polygon points="${st(100,140,20,7,6,.26)}" fill="none" stroke="#fff0b0" stroke-width="1.2"/>`
    +P('M74 196 L82 214 L90 198 L100 222 L110 198 L118 214 L126 196Z','url(#gOx)')+B('M74 196 L82 214 L90 198 L100 222 L110 198 L118 214 L126 196',1.6,'#ff8a2a');
  // vállak: lebegő láva-kövek
  const pauldron=k=>P(`M${100+k*30} 96 Q${100+k*52} 80 ${100+k*58} 102 L${100+k*50} 124 L${100+k*30} 116Z`,'url(#gOx)')+veins(`M${100+k*34} 100 L${100+k*48} 108 L${100+k*44} 120`)+`<polygon points="${st(100+k*52,90,9,3.5,5,k*.3)}" fill="url(#gMg)" ${G}/>`;
  // négy kar: kettő a pálcával és a napgolyóval, kettő tűzláncokkal
  const armA=L('M70 110 L44 88 L34 60','url(#gOx)',10)+veins('M66 108 L46 90 L38 66',.8)+L('M28 290 L40 22','#1a0806',5)+B('M28 290 L40 22',1.4,'#ff6a1a',.9)+eclipse(40,16,9);
  const armB=L('M130 110 L158 132 L170 144','url(#gOx)',10)+veins('M134 112 L156 132',.8)+GL(176,150,20,'#ff3a0a',.6)+`<circle cx="176" cy="150" r="11" fill="url(#gCore)" ${G}/>`+`<ellipse cx="176" cy="150" rx="22" ry="7" fill="none" stroke="#ffb04a" stroke-width="1.4" transform="rotate(-20 176 150)"/>`;
  const armC=k=>L(`M${100+k*30} 128 Q${100+k*58} 150 ${100+k*66} 182`,'url(#gOx)',8)+[0,1,2,3,4].map(i=>`<ellipse cx="${(100+k*(68+i*4)).toFixed(1)}" cy="${(188+i*9).toFixed(1)}" rx="2.8" ry="4" fill="none" stroke="#ff8a2a" stroke-width="1.8"/>`).join('')+GL(100+k*86,236,6,'#ff6a1a',.8);
  // fej: széttört maszk, alóla izzó napmag
  const head=P('M70 98 Q60 42 100 22 Q140 42 130 98 Q116 84 100 86 Q84 84 70 98Z','url(#gOx)')+B('M72 96 Q62 44 100 24 Q138 44 128 96',2,'#ff6a1a',.9)
    +P('M80 84 Q78 44 100 36 Q122 44 120 84 Q100 94 80 84Z','#020101')+GL(100,62,18,'#ff4a0a',.8)+`<circle cx="100" cy="62" r="13" fill="url(#gCore)" ${G}/>`
    +P('M82 46 Q92 38 100 40 L98 54 L90 60 L84 58Z','url(#gMask)')+B('M84 48 L90 52 L88 58',1,'#5a3a10')+P('M116 64 L120 72 L112 80 L106 74Z','url(#gMask)','opacity=".9"')
    +(e==='angry'?Y(93,60,'#fff',8,-1.4)+Y(107,60,'#fff',8,1.4):Y(93,60,'#fff',6,-.6)+Y(107,60,'#fff',6,.6))
    +B('M100 48 L98 56 M100 72 L102 80',1.2,'#fff0b0');
  // lebegő tüskekorona
  const crown2=[[-34,26],[-24,16],[-12,8],[0,2],[12,8],[24,16],[34,26]].map(([dx,dy],i)=>{const x=100+dx*1.2,y=12-dy*.6+(i%2?8:0);return P(`M${x-4} ${y+18} L${x} ${y-10} L${x+4} ${y+18}Z`,'url(#gOx)')+B(`M${x} ${y-8} L${x} ${y+14}`,1,'#ff8a2a')+GL(x,y-10,3,'#ffe27a',.9)}).join('');
  if(v==='b'){ s+=eclipse(100,70,48)+brokenWing(-1)+brokenWing(1)+storm+P('M68 100 Q58 150 64 204 L136 204 Q142 150 132 100Z','url(#gOx)')+veins('M100 104 L98 140 L102 180 L100 202')+pauldron(-1)+pauldron(1)+P('M66 98 Q58 40 100 22 Q142 40 134 98 Q100 112 66 98Z','url(#gOx)')+crown2; return s; }
  s+=eclipse(100,70,48)+brokenWing(-1)+brokenWing(1)+storm+armC(-1)+armC(1)+torso+pauldron(-1)+pauldron(1)+armA+armB+head+crown2;
  return s;
}
export { god2 };
/* ---------- Szikkadt Szilárd, 2. fázis: A Porvihar ---------- */
DEFS+=(gr('gSd','#e8cf9a','#b08a52','#6a4a24')+gr('gCl','#8a5a3a','#4a2a1a','#1a0c08')+`<radialGradient id="gEm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2d0"/><stop offset=".35" stop-color="#ff5a2a"/><stop offset=".75" stop-color="#a8140a"/><stop offset="1" stop-color="#5a0606" stop-opacity="0"/></radialGradient>`);
const wellStone=(x,y,r,a)=>`<g transform="rotate(${a} ${x} ${y})">`+P(`M${x-r} ${y-r*.55} L${x+r} ${y-r*.7} L${x+r*1.1} ${y+r*.5} L${x-r*.9} ${y+r*.65}Z`,'#7a7064')+P(`M${x-r} ${y-r*.55} L${x+r} ${y-r*.7} L${x+r*.9} ${y-r*.2} L${x-r*.9} ${y-r*.1}Z`,'#a89a86')+B(`M${x-r*.3} ${y-r*.5} L${x-r*.1} ${y+r*.5} M${x+r*.4} ${y-r*.6} L${x+r*.2} ${y+r*.1}`,1,'#3a3028')+`</g>`+GL(x,y+r,3,'#ff5a2a',.5);
const magicHand=k=>{const hx=100+k*66,hy=128;return L(`M${100+k*30} 104 Q${100+k*50} 112 ${hx} ${hy}`,'url(#gCo)',10)+B(`M${100+k*30} 104 Q${100+k*50} 112 ${hx} ${hy}`,1.6,'#c42a20',.9)+`<circle cx="${hx}" cy="${hy}" r="5" fill="url(#gSk)" ${G}/>`
  +GL(hx+k*6,hy-4,26,'#ff3a1a',.45)+`<circle cx="${hx+k*6}" cy="${hy-4}" r="24" fill="none" stroke="#ff4a2a" stroke-width="1.8"/><circle cx="${hx+k*6}" cy="${hy-4}" r="17" fill="none" stroke="#e8cf9a" stroke-width="1.2" stroke-dasharray="3 3"/><circle cx="${hx+k*6}" cy="${hy-4}" r="30" fill="none" stroke="#ff8a6a" stroke-width=".8" stroke-dasharray="1 5"/>`
  +`<polygon points="${st(hx+k*6,hy-4,22,8,7,k*.3)}" fill="none" stroke="#ffb08a" stroke-width="1"/>`+[0,1,2,3,4,5].map(i=>{const a=i*Math.PI/3;return runeTxt((hx+k*6+Math.cos(a)*27).toFixed(1),(hy-4+Math.sin(a)*27+2).toFixed(1),'ᛉᚦᛊᛟᚱᛞ'[i],'#ffd0c0',5.5)}).join('')
  +`<circle cx="${hx+k*6}" cy="${hy-4}" r="8" fill="url(#gEm)" ${G}/>`
  +[0,1,2,3,4,5,6].map(i=>{const a=i*.9+k,r=36+i*3;return `<circle cx="${(hx+k*6+Math.cos(a)*r).toFixed(1)}" cy="${(hy-4+Math.sin(a)*r*.7).toFixed(1)}" r="${1.2+i%3*.6}" fill="${i%2?'#e8cf9a':'#ff7a4a'}" opacity=".85"/>`}).join('')
  +B(`M${hx+k*6} ${hy-30} Q${hx+k*20} ${hy-52} ${hx+k*8} ${hy-70}`,1.6,'#ff5a2a',.7)+B(`M${hx+k*6} ${hy+22} Q${hx-k*10} ${hy+40} ${hx+k*4} ${hy+58}`,1.4,'#e8cf9a',.6);};
const sandBlade=k=>{const bx=100+k*36,by=110;return L(`M${bx} ${by} Q${100+k*62} 132 ${100+k*70} 160`,'url(#gCo)',10)+B(`M${bx} ${by} Q${100+k*62} 132 ${100+k*70} 160`,1.6,'#c42a20',.9)
  +P(`M${100+k*68} 156 Q${100+k*104} 150 ${100+k*96} 92 Q${100+k*92} 60 ${100+k*74} 40 Q${100+k*86} 84 ${100+k*78} 124 Q${100+k*74} 146 ${100+k*64} 162Z`,'url(#gSd)')
  +B(`M${100+k*74} 44 Q${100+k*90} 86 ${100+k*80} 128 Q${100+k*76} 148 ${100+k*66} 160`,2.2,'#ff4a2a',.9)+B(`M${100+k*74} 44 Q${100+k*90} 86 ${100+k*80} 128`,.8,'#ffe0b0')
  +[0,1,2,3].map(i=>runeTxt((100+k*(86-i*2)).toFixed(1),(70+i*18).toFixed(1),'ᛉᚦᛊᛟ'[i],'#ff8a6a',6)).join('')
  +`<g fill="#e8cf9a" opacity=".75">${[0,1,2,3,4,5].map(i=>`<circle cx="${(100+k*(98+i*3)).toFixed(1)}" cy="${(70+i*16).toFixed(1)}" r="${1.2+i%2}"/>`).join('')}</g>`;};
function szl2(v='f',e='angry'){
  let s='';
  // porvihar-alsótest
  const storm=P('M62 160 Q30 210 56 250 Q78 280 100 300 Q122 280 144 250 Q170 210 138 160Z','url(#gSd)','opacity=".55"')+P('M70 160 Q50 206 74 240 Q90 262 100 284 Q110 262 126 240 Q150 206 130 160Z','#3a2414','opacity=".7"')
    +[[-1,0],[1,0],[-1,1],[1,1],[0,2]].map(([k,j])=>`<path d="M${100+k*(14+j*12)} 166 Q${100+k*(64+j*10)} ${206+j*12} ${100+k*(24+j*8)} ${240+j*8} Q${100+k*6} 262 ${100+k*(38+j*14)} 292" stroke="${j>1?'#fff0d0':'#d8b98a'}" stroke-width="${4-j}" fill="none" opacity="${.8-j*.2}" stroke-linecap="round"/>`).join('')
    +`<g fill="#e8cf9a">${[[40,200],[160,206],[48,236],[152,244],[72,276],[128,272],[34,178],[166,182],[60,218],[140,226],[86,256],[114,262]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${1.1+i%3*.7}" opacity="${.45+i%2*.4}"/>`).join('')}</g>`;
  // kiszáradt gyökérindák
  const roots=[[-1,0],[1,0],[-1,1],[1,1]].map(([k,j])=>B(`M${100+k*20} ${150+j*10} Q${100+k*(52+j*18)} ${170+j*20} ${100+k*(46+j*30)} ${206+j*24} Q${100+k*(60+j*30)} ${226+j*20} ${100+k*(78+j*20)} ${236+j*14}`,3-j,'#5a3a24')).join('');
  // tépett köpeny, megrepedt agyagtest, izzó mag
  const coat=P('M68 96 Q54 130 56 168 L66 160 L70 178 L80 162 L88 180 L100 166 L112 180 L120 162 L130 178 L134 160 L144 168 Q146 130 132 96Z','url(#gCo)')+B('M56 168 L66 160 L70 178 L80 162 L88 180 L100 166 L112 180 L120 162 L130 178 L134 160 L144 168',2,'#c42a20');
  const torso=P('M80 96 L120 96 L124 160 L76 160Z','url(#gCl)')+B('M86 102 L92 120 L84 138 L92 156 M114 102 L108 122 L116 140 L110 156 M92 120 L100 128 L108 122',1.6,'#ff4a2a',.85)
    +GL(100,128,20,'#ff3a1a',.8)+`<circle cx="100" cy="128" r="12" fill="url(#gEm)" ${G}/>`+P('M100 116 L109 128 L100 142 L91 128Z','url(#gC)')+`<polygon points="${st(100,128,18,6,6)}" fill="none" stroke="#ffb08a" stroke-width="1"/>`
    +[[70,152],[66,162],[134,150],[138,160]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="3.6" fill="none" stroke="#9aa3ae" stroke-width="1.8"/>`).join('')+B('M70 166 L66 172 M136 164 L140 170',1.6,'#9aa3ae');
  // széttépett csuklya, gyökérkorona
  const head=P('M68 100 Q60 40 100 18 Q140 40 132 100 Q118 86 100 88 Q82 86 68 100Z','url(#gCo)')+P('M70 98 L64 70 L74 80 L72 52 L84 66 L86 36 L96 58 L100 26 L104 58 L114 36 L116 66 L128 52 L126 80 L136 70 L130 98Z','#0a0608','opacity=".35"')+B('M70 98 Q62 42 100 20 Q138 42 130 98',2.2,'#c42a20')
    +P('M80 86 Q78 46 100 38 Q122 46 120 86 Q100 94 80 86Z','#030203')+B('M84 50 L92 60 L88 72 M116 52 L110 62 L114 74 M100 40 L98 52',1.2,'#ff4a2a',.8)
    +GL(100,64,14,'#ff2a1a',.7)+(e==='angry'?Y(92,64,'#ff2a1a',9,-1.6)+Y(108,64,'#ff2a1a',9,1.6):Y(92,64,'#ff2a1a',7,-.6)+Y(108,64,'#ff2a1a',7,.6))
    +P('M90 78 L94 82 L98 78 L102 82 L106 78 L110 82 L106 86 L94 86Z','#ff5a2a','opacity=".85"');
  const crownR=[[-30,0],[-18,-10],[-6,-18],[6,-18],[18,-10],[30,0]].map(([dx,dy])=>B(`M${100+dx*.6} ${26} Q${100+dx} ${16+dy*.5} ${100+dx*1.3} ${8+dy}`,2.4,'#4a2e1a')+`<circle cx="${(100+dx*1.3).toFixed(1)}" cy="${8+dy}" r="1.8" fill="#ff5a2a"/>`).join('');
  // lebegő kútkő-gyűrű
  const stones=[[48,96,9,-20],[152,92,8,18],[40,140,7,10],[160,140,8,-12],[60,58,6,30],[140,54,7,-28]].map(([x,y,r,a])=>wellStone(x,y,r,a)).join('')+`<ellipse cx="100" cy="100" rx="64" ry="20" fill="none" stroke="#d8b98a" stroke-width="1" stroke-dasharray="2 6" opacity=".7"/>`;
  const coatL=P('M68 96 Q50 170 44 262 L58 252 L64 272 L76 254 L84 276 L92 256 L100 270 L108 256 L116 276 L124 254 L136 272 L142 252 L156 262 Q150 170 132 96Z','url(#gCo)')+B('M44 262 L58 252 L64 272 L76 254 L84 276 L92 256 L100 270 L108 256 L116 276 L124 254 L136 272 L142 252 L156 262',2,'#c42a20')+P('M86 150 L114 150 L118 262 L82 262Z','#0a0608','opacity=".55"');
  const feet=legs('#141018',11,'#1a1014')+B('M80 262 L94 262 M106 262 L120 262',2,'#c42a20');
  const dust=[[-1,0],[1,0],[-1,1],[1,1]].map(([k,j])=>`<path d="M${100+k*(12+j*12)} 290 Q${100+k*(44+j*16)} ${272-j*10} ${100+k*(30+j*20)} ${250-j*10}" stroke="#d8b98a" stroke-width="${3-j}" fill="none" opacity="${.7-j*.25}" stroke-linecap="round"/>`).join('')+`<ellipse cx="100" cy="288" rx="58" ry="9" fill="#d8b98a" opacity=".22"/>`;
  if(v==='b'){ s+=stones+roots+coatL+feet+P('M80 96 L120 96 L124 160 L76 160Z','url(#gCo)')+P('M68 100 Q60 40 100 18 Q140 40 132 100 Q100 114 68 100Z','url(#gCo)')+crownR; return s; }
  s+=stones+roots+coatL+feet+dust+torso+magicHand(-1)+magicHand(1)+head+crownR;
  return s;
}
export { szl2 };
export const svgOf=(inner,vb='0 0 120 120')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${DEFS}</defs>${inner}</svg>`;
export { EN, BI, kk, hf, stw, ldm, wdk, szl, god, pGh, pRl, pGt, pKt, pZr, pBt, sigil, sunHalo, drop };
