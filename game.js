/* DIGI-CLICKER — Cookie-Clicker-System im Digimon-Theme (Hommage, kein Original-Code).
   Artworks: digi-api.com (u.a. Wikimon) — © Bandai. Hotlinks mit Emoji-Fallback. */
'use strict';
const $ = id => document.getElementById(id);
const fmt = n => {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  const units = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  let u = -1, v = n;
  while (v >= 1000 && u < units.length-1){ v/=1000; u++; }
  return (v>=100? v.toFixed(0): v>=10? v.toFixed(1): v.toFixed(2)) + units[u];
};
const fmtTime = s => {
  s=Math.floor(s); const h=Math.floor(s/3600), m=Math.floor(s%3600/60);
  return h>0? `${h}h ${m}m` : (m>0? `${m}m ${s%60}s` : `${s}s`);
};
const IMG = 'https://digi-api.com/images/digimon/w/';
function spriteHTML(file, fb, cls){
  return `<img class="${cls}" src="${IMG+file}" alt="" loading="lazy" data-fb="${fb}" onerror="this.replaceWith(document.createTextNode(this.dataset.fb))">`;
}

/* ================= GEBÄUDE (14) ================= */
const BUILDINGS = [
  {id:'tokomon',   name:'Tokomon',   file:'Tokomon.png',   icon:'🍼', cost:15,    cps:0.1,     desc:'Winziger Helfer, klickt für dich.', nouns:['Mini-Kralle','Plüsch-Ohr','Schnuffel-Zahn','Baby-Feder','Winzlings-Mut']},
  {id:'babamon',   name:'Babamon',   file:'Babamon.png',   icon:'👵', cost:100,   cps:1,       desc:'Backt Bits nach uraltem Rezept.', nouns:['Holzlöffel','Geheimrezept','Wollschal','Backofen-Handschuh','Omas Segen']},
  {id:'tanemon',   name:'Tanemon',   file:'Tanemon.png',   icon:'🌱', cost:1100,  cps:8,       desc:'Pflanzt Daten-Samen an.', nouns:['Samen-Tüte','Gießkanne','Dünger-Bits','Sonnenlicht-Filter','Riesen-Blatt']},
  {id:'drimogemon',name:'Drimogemon',file:'Drimogemon.png',icon:'⛏️', cost:12000, cps:47,      desc:'Bohrt nach Bit-Erzen.', nouns:['Spitzhacke','Bohrhelm','Dynamit-Daten','Erz-Detektor','Titan-Bohrer']},
  {id:'guardromon',name:'Guardromon',file:'Guardromon.png',icon:'🏭', cost:130000,cps:260,     desc:'Produziert Bits am Fließband.', nouns:['Fließband-Öl','Schraubenschlüssel','Stahl-Platte','Warnleuchte','Kern-Reaktor']},
  {id:'digitamamon',name:'Digitamamon',file:'Digitamamon.png',icon:'🏦',cost:1400000,cps:1400, desc:'Verzinst deine Bits.', nouns:['Goldbarren','Zinseszins','Tresor-Code','Aktien-Daten','Casino-Chip']},
  {id:'angemon',   name:'Angemon',   file:'Angemon.png',   icon:'😇', cost:2e7,   cps:7800,    desc:'Segnet die Datenströme.', nouns:['Heiligenschein','Himmels-Feder','Gebets-Perle','Licht-Schwert','Engels-Chor']},
  {id:'wizarmon',  name:'Wizarmon',  file:'Wizarmon.png',  icon:'🧙', cost:3.3e8, cps:44000,   desc:'Beschwört Bits aus dem Digi-Raum.', nouns:['Zauberstab','Kristallkugel','Magier-Hut','Runen-Buch','Blitz-Robe']},
  {id:'airdramon', name:'Airdramon', file:'Airdramon.png', icon:'✈️', cost:5.1e9, cps:260000,  desc:'Liefert Bits per Luftfracht.', nouns:['Propeller','Fracht-Netz','Navigations-Chip','Sturm-Segel','Turbo-Düse']},
  {id:'vademon',   name:'Vademon',   file:'Vademon.png',   icon:'🛸', cost:7.5e10,cps:1600000, desc:'Transmutiert Daten zu Bits.', nouns:['Reagenzglas','Alien-Gehirn','Teleport-Strahl','Gen-Spritze','UFO-Teil']},
  {id:'pharaohmon',name:'Pharaohmon',file:'Pharaohmon.png',icon:'🏛️',cost:1e12,  cps:1e7,     desc:'Öffnet Tore zu Bit-Reichen.', nouns:['Hieroglyphe','Sarkophag','Wüsten-Kompass','Mumienschleier','Sonnen-Amulett']},
  {id:'clockmon',  name:'Clockmon',  file:'Clockmon.png',  icon:'⏰', cost:1.4e13,cps:6.5e7,   desc:'Holt Bits aus der Zukunft.', nouns:['Uhrwerk','Zeitzahnrad','Pendel','Chronometer','Ewigkeits-Batterie']},
  {id:'seraphimon',name:'Seraphimon',file:'Seraphimon.png',icon:'💠',cost:1.7e14,cps:4.3e8,   desc:'Bricht Licht in reine Bits.', nouns:['Prisma-Kern','Licht-Splitter','Regenbogen-Flügel','Heilig-Kristall','Testament-Kugel']},
  {id:'andromon',  name:'Andromon',  file:'Andromon.png',  icon:'🤖', cost:2.6e16,cps:2.9e9,   desc:'Reaktor für unendliche Bits.', nouns:['Plasma-Spule','Fusions-Kern','Kühlmittel','Neutronen-Stab','Singularitäts-Chip']},
];
const BUILD_TIERS = [1,10,25,50,100];
const TIER_COST = [10,100,1000,10000,100000];

/* ================= UPGRADES ================= */
const UPGRADES = [];
BUILDINGS.forEach(b=>{
  b.nouns.forEach((noun,i)=>{
    UPGRADES.push({id:`${b.id}_t${i}`, kind:'building', b:b.id, tier:i,
      name:`${noun} (${b.name})`, icon:b.icon,
      cost: Math.ceil(b.cost*TIER_COST[i]),
      desc:`${b.name}-Produktion ×2.`, req:{b:b.id, n:BUILD_TIERS[i]}});
  });
});
const CLICK_UPS = [
  {id:'c_finger',  name:'Digi-Finger',      icon:'👆', cost:100,   plus:1, reqTotal:10, desc:'+1 Bit pro Klick.'},
  {id:'c_finger2', name:'Stahl-Finger',     icon:'👆', cost:5000,  plus:1, reqTotal:500, desc:'+1 Bit pro Klick.'},
  {id:'c_double',  name:'Doppelgriff',      icon:'🙌', cost:10000, cmult:2, reqTotal:1000, desc:'Klicks ×2.'},
  {id:'c_ambi',    name:'Beidhändigkeit',   icon:'🤲', cost:1e6,   frac:0.01, reqTotal:1e5, desc:'Klicks erhalten +1% deines CPS.'},
  {id:'c_thousand',name:'Tausend Finger',   icon:'🖐️', cost:1e8,   frac:0.02, reqTotal:1e7, desc:'Klicks erhalten +2% deines CPS.'},
  {id:'c_mouse',   name:'Mäuse-Armee',      icon:'🐭', cost:1e10,  perTok:1, reqTotal:1e9, desc:'+1 Bit pro Klick pro Tokomon.'},
  {id:'c_million', name:'Millionen Finger', icon:'🌟', cost:1e13,  cmult:2, reqTotal:1e12, desc:'Klicks ×2.'},
  {id:'c_billion', name:'Milliarden Finger',icon:'💫', cost:1e17,  frac:0.05, reqTotal:1e16, desc:'Klicks erhalten +5% deines CPS.'},
  {id:'c_trillion',name:'Billionen Finger', icon:'✨', cost:1e21,  cmult:2, reqTotal:1e20, desc:'Klicks ×2.'},
  {id:'c_god',     name:'Digi-Gottheit',    icon:'👑', cost:1e26,  cmult:2, frac:0.1, reqTotal:1e25, desc:'Klicks ×2 und +10% CPS als Klick.'},
];
CLICK_UPS.forEach(u=>UPGRADES.push(Object.assign({kind:'click'}, u)));
const MILK_UPS = [
  {id:'milk1', name:'Gatomon',       icon:'🐱', cost:1e7,  milkReq:25,  F:0.05, desc:'CPS ×(1 + Milch×5%).'},
  {id:'milk2', name:'Gatomon-Star',  icon:'🐈', cost:1e9,  milkReq:75,  F:0.05, desc:'CPS ×(1 + Milch×5%).'},
  {id:'milk3', name:'Angewomon-Blick',icon:'😻',cost:1e11, milkReq:150, F:0.10, desc:'CPS ×(1 + Milch×10%).'},
  {id:'milk4', name:'Heilige Mieze', icon:'🙀', cost:1e13, milkReq:225, F:0.15, desc:'CPS ×(1 + Milch×15%).'},
];
MILK_UPS.forEach(u=>UPGRADES.push(Object.assign({kind:'milk'}, u)));
const LUCK_UPS = [
  {id:'luck1', name:'Kleeblatt',  icon:'🍀', cost:777777,    freq:2, reqTotal:1e5, desc:'Goldene Eier erscheinen 2× so häufig.'},
  {id:'luck2', name:'Hufeisen',   icon:'🍀', cost:77777777,  freq:2, reqTotal:1e7, desc:'Goldene Eier erscheinen 2× so häufig.'},
  {id:'luck3', name:'Goldrausch', icon:'🌟', cost:77777777777, dur:2, reqTotal:1e10, desc:'Goldene Eier dauern 2× so lang.'},
];
LUCK_UPS.forEach(u=>UPGRADES.push(Object.assign({kind:'luck'}, u)));
UPGRADES.push({id:'vswarm', kind:'wrinkler', name:'Virus-Schwarm', icon:'🦠', cost:5e6,
  desc:'Lässt hungrige Viren frei: Sie zapfen CPS ab, platzen aber mit Bonus.', req:{b:'babamon', n:15}});
const UPG_BY_ID = {};
UPGRADES.forEach(u=>UPG_BY_ID[u.id]=u);

/* Himmels-Upgrades (permanent, kosten Chips) */
const HEAVENLY = [];
for(let i=0;i<5;i++) HEAVENLY.push({id:`hsegen${i}`, name:`Himmels-Segen ${['I','II','III','IV','V'][i]}`, icon:'😇', cost:10*Math.pow(5,i), kind:'hcps', desc:'+5% CPS, permanent.'});
for(let i=0;i<3;i++) HEAVENLY.push({id:`hgold${i}`, name:`Goldene Voraussicht ${['I','II','III'][i]}`, icon:'🔮', cost:20*Math.pow(5,i), kind:'hfreq', desc:'+20% goldene Eier, permanent.'});
for(let i=0;i<3;i++) HEAVENLY.push({id:`hclick${i}`, name:`Fester Händedruck ${['I','II','III'][i]}`, icon:'🤝', cost:5*Math.pow(5,i), kind:'hclick', desc:'+10% Klick-Stärke, permanent.'});
for(let i=0;i<3;i++) HEAVENLY.push({id:`hmilk${i}`, name:`Milchstraße ${['I','II','III'][i]}`, icon:'🌌', cost:30*Math.pow(5,i), kind:'hmilk', desc:'+25% Milch, permanent.'});
HEAVENLY.push({id:'hstart1', name:'Digi-Ei-Vorrat I', icon:'🥚', cost:15, kind:'hstart', amt:1e6, desc:'Starte mit 1M Bits.'});
HEAVENLY.push({id:'hstart2', name:'Digi-Ei-Vorrat II', icon:'🥚', cost:150, kind:'hstart', amt:1e9, desc:'Starte mit 1B Bits.'});
HEAVENLY.push({id:'hstart3', name:'Digi-Ei-Vorrat III', icon:'🥚', cost:1500, kind:'hstart', amt:1e11, desc:'Starte mit 100B Bits.'});
HEAVENLY.push({id:'htrup', name:'Tamer-Trupp', icon:'🧢', cost:25, kind:'htrup', desc:'Starte mit +5 Tokomon.'});

/* ================= ERFOLGE ================= */
const ACH = [];
const A = (id,icon,name,desc,check)=>ACH.push({id,icon,name,desc,check});
[[10,'Klick-Anfänger'],[1e3,'Flinke Finger'],[1e5,'Klick-Sturm'],[1e7,'Finger-Gott']].forEach(([n,nm])=>
  A(`click${n}`,'👆',nm,`${fmt(n)} Klicks`,s=>s.clicks>=n));
[[1e4,'Taschengeld'],[1e6,'Bit-Regen'],[1e8,'Daten-Millionär'],[1e10,'Bit-Milliardär'],[1e12,'Billionen-Tamer'],[1e14,'Billarden-Hoard'],[1e16,'Trillionen-Legende'],[1e18,'Quintillionen-Gott']].forEach(([n,nm])=>
  A(`bake${n}`,'🪙',nm,`${fmt(n)} Bits insgesamt`,s=>s.allTime>=n));
[[1,'Erster Funke'],[10,'Warmgelaufen'],[100,'Stromnetz'],[1e3,'Kraftwerk'],[1e5,'Bit-Reaktor'],[1e6,'Terawatt-Tamer'],[1e8,'Stellar-Ofen'],[1e9,'Galaxie-Engine']].forEach(([n,nm])=>
  A(`cps${n}`,'⚡',nm,`${fmt(n)} Bits/Sek`,s=>calcCps(s,false)>=n));
BUILDINGS.forEach(b=>{
  A(`own1_${b.id}`,'⭐',`${b.name}-Freund`,`1 ${b.name}`,s=>(s.buildings[b.id]||0)>=1);
  A(`own25_${b.id}`,'🌟',`${b.name}-Armee`,`25 ${b.name}`,s=>(s.buildings[b.id]||0)>=25);
});
[[25,'Großfamilie'],[50,'Digi-Dorf'],[100,'Digitale Stadt'],[150,'Bit-Metropole'],[250,'Digi-Zivilisation']].forEach(([n,nm])=>
  A(`herd${n}`,'🏘️',nm,`${n} Helfer gesamt`,s=>totalBuildings(s)>=n));
[[1,'Goldgräber'],[7,'Goldjäger'],[27,'Goldkönig']].forEach(([n,nm])=>
  A(`gold${n}`,'🥚',nm,`${n} goldene Eier`,s=>s.goldenClicks>=n));
[[1,'Schädlingsbekämpfer'],[25,'Kammerjäger']].forEach(([n,nm])=>
  A(`wrin${n}`,'🦠',nm,`${n} Viren zerplatzt`,s=>s.wrinklerPops>=n));
A('asc1','🌅','Wiedergeburt','1 Ascension',s=>s.ascensions>=1);
A('asc5','🌠','Ewiger Kreis','5 Ascensions',s=>s.ascensions>=5);
A('chip100','💠','Chip-Sammler','100 Himmels-Chips (je verdient)',s=>s.chipsTotal>=100);

/* ================= NEWS ================= */
const NEWS = [
  {t:'Willkommen in der Digitalen Welt, Tamer!'},
  {t:'Tokomon stupst neugierig das große Digi-Ei an.'},
  {t:'Studie: Bits schmecken am besten frisch geklickt.'},
  {t:'Babamon verrät heute ihr Geheimrezept — fast.'},
  {t:'Vademon bestreitet, je ein Labor in die Luft gejagt zu haben.'},
  {t:'Wetter: Sonnig mit vereinzelten Datenschauern.'},
  {t:'Angemon segnet die Server — Latenz sinkt auf Gebetsniveau.'},
  {t:'Eilmeldung: Ei wackelt. Experten ratlos, Tokomon begeistert.'},
  {t:'Digitamamon erhöht die Zinsen. Wirtschaft jubelt.'},
  {t:'Wizarmon zaubert aus Versehen 1.000 Bits herbei. Niemand beschwert sich.'},
  {t:'Airdramon liefert pünktlich — trotz Gegenwind aus dem Netz.'},
  {t:'Clockmon meldet: Die Zukunft enthält mehr Bits als gedacht.'},
  {t:'Seraphimon spaltet Lichtstrahl in 10.000 saubere Bits.'},
  {t:'Andromon summt zufrieden im Standby.'},
  {t:'Pharaohmon öffnet ein Tor. Dahinter: noch mehr Bits.'},
  {t:'Tanemon keimt. Die Farm wächst und wächst.'},
  {t:'Drimogemon stößt auf reines Bit-Erz. Bohrer glühen.'},
  {t:'Guardromon übertrifft die Quote. Überstunden freiwillig.'},
  {t:'Gerücht: Goldene Eier bringen großes Glück.', c:s=>s.goldenClicks===0},
  {t:'Deine Tokomon-Armee wächst! Die Eier wackeln im Takt.', c:s=>(s.buildings.tokomon||0)>=10},
  {t:'Babamons Küche duftet bis in die Server-Farm.', c:s=>(s.buildings.babamon||0)>=5},
  {t:'Dunkle Viren umkreisen das Ei. Bleib wachsam, Tamer!', c:s=>!!s.ups.vswarm},
  {t:'Die Milchstraße fließt stark heute. Katzen nicken anerkennend.', c:s=>milkPct(s)>=25},
  {t:'Himmlische Chöre singen von deiner Wiedergeburt.', c:s=>s.ascensions>0},
  {t:'Andromon-Reaktor erreicht kritische Gemütlichkeit.', c:s=>(s.buildings.andromon||0)>=1},
];

/* ================= STATE ================= */
const SAVE_KEY = 'digiClickerSaveV1';
let S;
function freshRun(){
  return {bits:0,total:0,clicks:0,cpsPeak:0,buildings:{},ups:{},
    goldenClicks:0,wrinklerPops:0,buffs:[],wrinklers:[],nextGolden:0,nextWrinkler:0,
    runStart:Date.now()};
}
function freshState(){
  return Object.assign(freshRun(), {allTime:0,chips:0,chipsTotal:0,ascensions:0,ach:{},hups:{},
    buyAmt:1,sellMode:false,sound:true,particles:true,numbers:true,dev:false,startTime:Date.now()});
}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return freshState();
    const s=Object.assign(freshState(),JSON.parse(raw));
    s.run=undefined;
    s.buffs=[]; s.wrinklers=[]; // keine Buffs/Viren über Sessions
    s.nextGolden=Date.now()+(75+Math.random()*100)*1000;
    return Object.assign(freshRun(),s,{buffs:[],wrinklers:[]});
  }catch{ return freshState(); }
}
function save(){ try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch{} }

/* ================= FORMELN ================= */
const owned = (s,id)=>(s.buildings[id]||0);
const totalBuildings = s=>Object.values(s.buildings).reduce((a,b)=>a+b,0);
const hcount = (s,kind)=>HEAVENLY.filter(h=>h.kind===kind&&s.hups[h.id]).length;
function bPrice(b,n){ return Math.ceil(b.cost*Math.pow(1.15,n)); }
function bulkCost(b,n,k){ return Math.ceil(b.cost*Math.pow(1.15,n)*(Math.pow(1.15,k)-1)/0.15); }
function maxAffordable(b,n,bits){
  const cur=b.cost*Math.pow(1.15,n);
  if(bits<cur) return 0;
  return Math.max(0,Math.floor(Math.log(bits*0.15/cur+1)/Math.log(1.15)));
}
function bTierCount(s,bid){ return UPGRADES.filter(u=>u.kind==='building'&&u.b===bid&&s.ups[u.id]).length; }
const achCount = s=>Object.keys(s.ach).length;
const milkPct = s=>4*achCount(s)*(1+0.25*hcount(s,'hmilk'));
function kittenMult(s){
  let m=1; const f=milkPct(s)/100;
  for(const u of MILK_UPS) if(s.ups[u.id]) m*= (1+f*u.F);
  return m;
}
function buffMult(s){ return s.buffs.reduce((m,b)=>m*(b.mult||1),1); }
function clickBuffMult(s){ return s.buffs.reduce((m,b)=>m*(b.cmult||1),1); }
function goldenFreq(s){
  let f=1;
  for(const u of LUCK_UPS) if(s.ups[u.id]&&u.freq) f*=u.freq;
  return f*(1+0.2*hcount(s,'hfreq'));
}
function goldenDur(s){ let d=1; for(const u of LUCK_UPS) if(s.ups[u.id]&&u.dur) d*=u.dur; return d; }
function calcCps(s,withBuffs=true){
  let c=0;
  for(const b of BUILDINGS) c+=owned(s,b.id)*b.cps*Math.pow(2,bTierCount(s,b.id));
  c*=kittenMult(s)*Math.pow(1.05,hcount(s,'hcps'))*(1+0.02*s.chips);
  // Viren zapfen je 5% ab
  c*= (1-0.05*Math.min(8,(s.wrinklers||[]).length));
  if(withBuffs) c*=buffMult(s);
  return c;
}
function clickParts(s){
  let plus=0,cmult=1,frac=0,perTok=0;
  for(const u of CLICK_UPS) if(s.ups[u.id]){
    plus+=(u.plus||0); if(u.cmult)cmult*=u.cmult; frac+=(u.frac||0); perTok+=(u.perTok||0);
  }
  cmult*=Math.pow(1.1,hcount(s,'hclick'));
  return {plus,cmult,frac,perTok};
}
function calcClick(s){
  const p=clickParts(s);
  return ((1+p.plus+owned(s,'tokomon')*p.perTok)*p.cmult + calcCps(s,true)*p.frac)*clickBuffMult(s);
}

/* ================= TOOLTIP (folgt der Maus) ================= */
function moveTip(x,y){
  const tip=$('tooltip'), pad=16, r=tip.getBoundingClientRect();
  let lx=x+pad, ly=y+pad;
  if(lx+r.width>innerWidth-10) lx=x-r.width-pad;
  if(ly+r.height>innerHeight-10) ly=Math.max(10,y-r.height-pad);
  tip.style.left=Math.max(10,lx)+'px'; tip.style.top=Math.max(10,ly)+'px';
}
function showTip(html,x,y){
  const tip=$('tooltip');
  tip.innerHTML=html; tip.classList.remove('hidden');
  moveTip(x,y);
}
function hideTip(){ $('tooltip').classList.add('hidden'); }
function bindTip(el,htmlFn){
  el.addEventListener('mouseenter',e=>showTip(htmlFn(),e.clientX,e.clientY));
  el.addEventListener('mousemove',e=>{ if(!$('tooltip').classList.contains('hidden')) moveTip(e.clientX,e.clientY); });
  el.addEventListener('mouseleave',hideTip);
}
function costLine(cost,can){
  return `<p class="t-cost${can?'':' no'}">${can?'✅':'🔒'} Preis: 🪙 ${fmt(cost)}</p>`;
}
function upgTip(u){
  let req='', fx='';
  if(u.kind==='building'){
    const b=BUILDINGS.find(x=>x.id===u.b);
    req=`<p class="t-req">Benötigt: ${u.req.n}× ${b.name} (du hast ${owned(S,u.b)})</p>`;
    fx=`<p class="t-fx">Effekt: ${b.name}-Produktion ×2</p>`;
  }else if(u.kind==='click'){
    if(u.reqTotal) req=`<p class="t-req">Benötigt: ${fmt(u.reqTotal)} Bits gebacken (Run: ${fmt(S.total)})</p>`;
    fx=`<p class="t-fx">Effekt: ${u.desc}</p>`;
  }else if(u.kind==='milk'){
    const f=milkPct(S)/100, now=(1+f*u.F);
    req=`<p class="t-req">Benötigt: ${u.milkReq}% Milch (du hast ${Math.floor(milkPct(S))}%)</p>`;
    fx=`<p class="t-fx">Effekt jetzt: CPS ×${now.toFixed(2)} — wächst mit mehr Milch!</p>`;
  }else if(u.kind==='luck'){
    if(u.reqTotal) req=`<p class="t-req">Benötigt: ${fmt(u.reqTotal)} Bits gebacken (Run: ${fmt(S.total)})</p>`;
    fx=`<p class="t-fx">Effekt: ${u.desc}</p>`;
  }else if(u.kind==='wrinkler'){
    req=`<p class="t-req">Benötigt: ${u.req.n}× Babamon (du hast ${owned(S,'babamon')})</p>`;
    fx=`<p class="t-fx">Effekt: ${u.desc}</p>`;
  }
  return `<h4>${u.icon} ${u.name}</h4><p>${u.desc}</p>${fx}${req}${costLine(u.cost,S.bits>=u.cost)}`;
}
function buildingTip(b){
  const n=owned(S,b.id), each=b.cps*Math.pow(2,bTierCount(S,b.id)), tot=n*each;
  const cps=calcCps(S,true), share=cps>0?Math.round(tot/cps*100):0;
  const k=S.buyAmt;
  const info=!S.sellMode
    ? `<p class="t-fx">Kaufen: +${k===100?'bis zu 100':k} für 🪙 ${fmt(k===100?bulkCost(b,n,Math.max(1,Math.min(100,maxAffordable(b,n,S.bits)))):bulkCost(b,n,k))}</p>`
    : `<p class="t-fx">Verkaufen: 50% Rückkauf pro Einheit</p>`;
  return `<h4>${b.icon} ${b.name} <span style="float:right">×${n}</span></h4><p>${b.desc}</p>`+
    `<p class="t-fx">Produziert: ⚡${fmt(tot)}/s total (${share}% deines CPS, je ${fmt(each)}/s)</p>${info}`;
}
function heavenTip(h){
  const has=!!S.hups[h.id];
  return `<h4>${h.icon} ${h.name}</h4><p>${h.desc}</p>`+
    (has?`<p class="t-fx">✅ Aktiv (permanent)</p>`:`<p class="t-cost${S.chips>=h.cost?'':' no'}">Preis: 💠 ${h.cost} Chips (du hast ${S.chips})</p>`);
}

/* ================= UI-HELFER ================= */
function toast(msg){
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  $('toastWrap').appendChild(el); setTimeout(()=>el.remove(),3500);
}
function floatText(txt,gold){
  if(!S.numbers) return;
  const f=document.createElement('div'); f.className='float'+(gold?' gold':'');
  f.textContent=txt; f.style.left=(25+Math.random()*50)+'%'; f.style.top='40%';
  $('floatLayer').appendChild(f); setTimeout(()=>f.remove(),1100);
}
let AC=null;
function blip(freq=600,dur=0.07){
  if(!S.sound) return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),g=AC.createGain();
    o.connect(g);g.connect(AC.destination);o.frequency.value=freq;
    g.gain.setValueAtTime(0.06,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
    o.start();o.stop(AC.currentTime+dur);
  }catch{}
}

/* ================= AKTIONEN ================= */
function doClick(){
  const v=calcClick(S);
  S.bits+=v;S.total+=v;S.allTime+=v;S.clicks++;
  blip(500+Math.random()*250,.05);
  const img=$('bigImg'); img.style.transform='scale(.9)';
  setTimeout(()=>img.style.transform='',70);
  floatText('+'+fmt(v));
  if(S.particles&&Math.random()<0.3) floatText(['✨','💫','⭐'][Math.floor(Math.random()*3)]);
  renderTop();
}
function upgVisible(u){
  if(S.ups[u.id]) return false;
  if(u.kind==='building') return owned(S,u.b)>=u.req.n;
  if(u.kind==='click'||u.kind==='luck') return S.total>=(u.reqTotal||0);
  if(u.kind==='milk') return milkPct(S)>=u.milkReq;
  if(u.kind==='wrinkler') return owned(S,'babamon')>=u.req.n;
  return true;
}
function buyUpg(id){
  const u=UPG_BY_ID[id];
  if(!u||S.ups[id]||!upgVisible(u)||S.bits<u.cost) return;
  if(u.kind==='wrinkler'&&owned(S,'babamon')<u.req.n) return;
  S.bits-=u.cost; S.ups[id]=1;
  blip(900,.1); toast(`⬆️ ${u.name}: ${u.desc}`);
  if(id==='vswarm'){ S.nextWrinkler=Date.now()+10000; toast('🦠 Der Virus-Schwarm kreist ums Ei!'); }
  checkAch(); renderStore(); renderTop(); save();
}
function buyBuilding(b){
  const k=S.buyAmt, n=owned(S,b.id);
  if(!S.sellMode){
    const afford=k===100?Math.max(1,Math.min(100,maxAffordable(b,n,S.bits))):k;
    const cost=k===100?bulkCost(b,n,afford):bulkCost(b,n,k);
    if(S.bits<cost||afford<1) return;
    S.bits-=cost; S.buildings[b.id]=n+afford;
    blip(700,.07);
  }else{
    if(n<=0) return;
    const sell=Math.min(k,n); let refund=0;
    for(let i=0;i<sell;i++) refund+=Math.ceil(b.cost*Math.pow(1.15,n-1-i)*0.5);
    S.buildings[b.id]=n-sell; S.bits+=refund; S.total+=0; // Verkauf zählt nicht als gebacken
    blip(300,.07); floatText('+'+fmt(refund)+' 🪙');
  }
  checkAch(); renderStore(); renderTop(); save();
}
/* ---- Goldene Eier ---- */
function scheduleGolden(){
  S.nextGolden=Date.now()+(75+Math.random()*150)*1000/goldenFreq(S);
}
function spawnGolden(){
  const g=$('golden');
  g.classList.remove('hidden');
  g.style.left=(5+Math.random()*85)+'vw';
  g.style.top=(15+Math.random()*60)+'vh';
  S.goldenUntil=Date.now()+13000*goldenDur(S);
}
function collectGolden(){
  $('golden').classList.add('hidden');
  S.goldenClicks++;
  const cps=calcCps(S,true), r=Math.random();
  blip(1200,.2);
  if(r<0.47){
    S.buffs.push({name:'Rausch! CPS ×7',mult:7,until:Date.now()+77000});
    toast('🌟 RAUSCH! Produktion ×7 für 77s!');
  }else if(r<0.86){
    const gain=Math.floor(Math.min(S.bits*0.15,cps*900)+13);
    S.bits+=gain;S.total+=gain;S.allTime+=gain;
    floatText('+'+fmt(gain)+' 🪙',true);
    toast(`🍀 GLÜCK! +${fmt(gain)} Bits!`);
  }else{
    S.buffs.push({name:'Klick-Rausch! ×777',cmult:777,until:Date.now()+13000});
    toast('👆 KLICK-RAUSCH! Klicks ×777 für 13s!');
  }
  scheduleGolden(); checkAch(); renderTop(); save();
}
/* ---- Viren (Wrinkler) ---- */
const WRINKLER_SPRITES=[['Gazimon.png','👾'],['Gizamon.png','🦠'],['Pico_Devimon.png','🦇'],['Orgemon.png','👹'],['Devimon.png','😈'],['Etemon.png','🐒'],['Vamdemon.png','🧛'],['Skull_Greymon.png','💀']];
function popWrinkler(i){
  const w=S.wrinklers[i]; if(!w) return;
  const gain=Math.floor(w.stored*1.1);
  if(gain>0){ S.bits+=gain;S.total+=gain;S.allTime+=gain; floatText('+'+fmt(gain)+' 🪙',true); }
  S.wrinklers.splice(i,1); S.wrinklerPops++;
  blip(400,.12); toast(`🦠 Virus zerplatzt! +${fmt(gain)} Bits`);
  checkAch(); renderTop(); save();
}
/* ---- Ascension ---- */
function chipsEarnable(){ return Math.floor(Math.cbrt(S.allTime/1e12)); }
function ascend(){
  const newChips=chipsEarnable()-S.chipsTotal;
  if(newChips<1) return;
  if(!confirm(`Wirklich aufsteigen? Du erhältst ${newChips} Himmels-Chips (Besitz danach: ${S.chips+newChips}). Erfolge, Chips und Himmels-Upgrades bleiben — der Rest wird zurückgesetzt.`)) return;
  S.chips+=newChips; S.chipsTotal+=newChips; S.ascensions++;
  const keepAch=S.ach, keepH=S.hups, keepChips=S.chips, keepCT=S.chipsTotal, keepAsc=S.ascensions,
        keepAll=S.allTime, snd=S.sound, part=S.particles, num=S.numbers, st=S.startTime;
  const startLvl=Object.keys(keepH).filter(k=>k.startsWith('hstart')).length;
  const startBits=[0,1e6,1e9,1e11][startLvl]||0;
  const fresh=freshRun();
  S=Object.assign(freshState(),fresh,{allTime:keepAll,chips:keepChips,chipsTotal:keepCT,
    ascensions:keepAsc,ach:keepAch,hups:keepH,sound:snd,particles:part,numbers:num,startTime:st,
    bits:startBits,total:startBits,runStart:Date.now()});
  if(keepH.htrup) S.buildings.tokomon=5;
  scheduleGolden();
  save(); renderAll();
  toast(`🌅 Ascension! +${newChips} Himmels-Chips`);
}
function buyHeaven(id){
  const h=HEAVENLY.find(x=>x.id===id);
  if(!h||S.hups[id]||S.chips<h.cost) return;
  S.chips-=h.cost; S.hups[id]=1;
  blip(1100,.15); toast(`✨ ${h.name}: ${h.desc}`);
  renderAsc(); renderTop(); save();
}

/* ================= DEV-MENÜ (Cheats zum Testen) ================= */
function parseAmount(str){
  const m=/^\s*([\d.,]+(?:e[+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(str||'');
  if(!m) return NaN;
  const num=parseFloat(m[1].replace(',','.'));
  if(!isFinite(num)||num<0) return NaN;
  const mult={'':1,k:1e3,m:1e6,b:1e9,t:1e12,qa:1e15,qi:1e18,sx:1e21,sp:1e24,oc:1e27}[(m[2]||'').toLowerCase()];
  return mult===undefined?NaN:num*mult;
}
function devBits(n){
  if(!isFinite(n)||n<=0){ toast('❌ Ungültiger Betrag (z.B. 500K, 2.5B, 1e12)'); return; }
  S.bits+=n;S.total+=n;S.allTime+=n;
  toast(`🛠️ +${fmt(n)} Bits`);
  checkAch(); renderAll(); save();
}
function devResetRunBonusChips(){
  // wie ascend(), aber gratis +1 Chip, ohne Confirm
  S.chips+=1; S.chipsTotal+=1; S.ascensions++;
  const keep={ach:S.ach,hups:S.hups,chips:S.chips,chipsTotal:S.chipsTotal,ascensions:S.ascensions,
    allTime:S.allTime,sound:S.sound,particles:S.particles,numbers:S.numbers,dev:S.dev,startTime:S.startTime};
  const startLvl=Object.keys(keep.hups).filter(k=>k.startsWith('hstart')).length;
  const startBits=[0,1e6,1e9,1e11][startLvl]||0;
  S=Object.assign(freshState(),freshRun(),{allTime:keep.allTime,chips:keep.chips,chipsTotal:keep.chipsTotal,
    ascensions:keep.ascensions,ach:keep.ach,hups:keep.hups,sound:keep.sound,particles:keep.particles,
    numbers:keep.numbers,dev:keep.dev,startTime:keep.startTime,bits:startBits,total:startBits,runStart:Date.now()});
  if(keep.hups.htrup) S.buildings.tokomon=5;
  scheduleGolden(); save(); renderAll();
  toast('🛠️ Gratis-Ascension: +1 Chip');
}
function renderDev(){
  $('tabBtnDev').classList.toggle('hidden',!S.dev);
  $('devBtn').textContent=S.dev?'🛠️ Dev-Menü: AN':'🛠️ Dev-Menü: AUS';
  if(!S.dev) return;
  $('devInfo').textContent=
    `Bits ${fmt(S.bits)} · CPS ${fmt(calcCps(S,true))} · Klick ${fmt(calcClick(S))} · `+
    `Helfer ${fmt(totalBuildings(S))} · Upg ${Object.keys(S.ups).length}/${UPGRADES.length} · `+
    `Himmel ${Object.keys(S.hups).length}/${HEAVENLY.length} · Erfolge ${achCount(S)}/${ACH.length} · `+
    `Chips ${S.chips} (je ${S.chipsTotal}) · Buffs ${S.buffs.length} · Viren ${S.wrinklers.length}`;
}
function toggleDev(){
  S.dev=!S.dev;
  if(!S.dev){
    // vom Dev-Tab zurück auf Statistik wechseln
    document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tabpage').forEach(x=>x.classList.remove('active'));
    document.querySelector('[data-tab="stats"]').classList.add('active');
    $('tab-stats').classList.add('active');
  }
  renderDev(); save();
  toast(S.dev?'🛠️ Dev-Menü aktiviert (F8 zum Umschalten)':'🛠️ Dev-Menü deaktiviert');
}
function initDev(){
  $('devBtn').onclick=toggleDev;
  $('devBitsBtn').onclick=()=>devBits(parseAmount($('devBitsInput').value));
  $('devBitsM').onclick=()=>devBits(1e6);
  $('devBitsB').onclick=()=>devBits(1e9);
  $('devBitsT').onclick=()=>devBits(1e12);
  $('devBitsQa').onclick=()=>devBits(1e15);
  const chip=n=>{ S.chips+=n;S.chipsTotal+=n; toast(`🛠️ +${n} Chips`); renderAll(); save(); };
  $('devChip1').onclick=()=>chip(1);
  $('devChip10').onclick=()=>chip(10);
  $('devChip100').onclick=()=>chip(100);
  $('devB10').onclick=()=>{ BUILDINGS.forEach(b=>S.buildings[b.id]=owned(S,b.id)+10); toast('🛠️ Je +10 Helfer'); checkAch(); renderAll(); save(); };
  $('devAllUpg').onclick=()=>{ UPGRADES.forEach(u=>S.ups[u.id]=1); if(!S.nextWrinkler)S.nextWrinkler=Date.now()+10000; toast('🛠️ Alle Upgrades freigeschaltet'); checkAch(); renderAll(); save(); };
  $('devAllHeaven').onclick=()=>{ HEAVENLY.forEach(h=>S.hups[h.id]=1); toast('🛠️ Alle Himmels-Upgrades aktiv'); renderAll(); save(); };
  $('devAllAch').onclick=()=>{ ACH.forEach(a=>S.ach[a.id]=1); toast('🛠️ Alle Erfolge freigeschaltet'); renderAll(); save(); };
  $('devGold').onclick=()=>{ spawnGolden(); toast('🛠️ Goldenes Ei gespawnt'); };
  $('devWrink').onclick=()=>{
    if(!S.ups.vswarm) S.ups.vswarm=1;
    const cps=Math.max(1000,calcCps(S,false));
    while(S.wrinklers.length<8) S.wrinklers.push({stored:cps*30,angle:Math.random()*6.28});
    S.nextWrinkler=Date.now()+45000;
    toast('🛠️ 8 Viren gefüllt'); renderWrinklers(); save();
  };
  $('devFrenzy').onclick=()=>{ S.buffs.push({name:'Rausch! CPS ×7 (DEV)',mult:7,until:Date.now()+600000}); toast('🛠️ Rausch für 10 Min'); renderTop(); save(); };
  $('devAsc').onclick=devResetRunBonusChips;
}

/* ================= CHECKS ================= */
function checkAch(){
  for(const a of ACH){
    if(!S.ach[a.id]&&a.check(S)){
      S.ach[a.id]=1;
      toast(`${a.icon} Erfolg: ${a.name}`);
      blip(1000,.12);
    }
  }
}

/* ================= RENDER ================= */
function renderTop(){
  $('bits').textContent=fmt(S.bits);
  $('bps').textContent=fmt(calcCps(S,true));
  $('clickVal').textContent=fmt(calcClick(S));
  $('chips').textContent=S.chips;
  $('milkTop').textContent=Math.floor(milkPct(S))+'%';
  $('milkFill').style.height=Math.min(100,milkPct(S)/5)+'%';
  $('milkLabel').textContent=`🥛 Milch: ${Math.floor(milkPct(S))}% (${achCount(S)} Erfolge)`;
  // Buffs
  const now=Date.now();
  S.buffs=S.buffs.filter(b=>b.until>now);
  $('buffs').innerHTML=S.buffs.map(b=>{
    const s=Math.ceil((b.until-now)/1000);
    return `<span class="buff">🌟 ${b.name} (${s}s)</span>`;
  }).join('');
}
let storeSig='';
function renderStore(){
  // Signatur: nur neu aufbauen, wenn sich wirklich etwas geändert hat —
  // sonst würde der Hover-Tooltip jede Sekunde verschwinden.
  const vis=UPGRADES.filter(upgVisible);
  const sigParts=[S.buyAmt,S.sellMode?1:0];
  vis.slice(0,40).forEach(u=>sigParts.push(u.id,S.bits>=u.cost?1:0));
  BUILDINGS.forEach(b=>{
    const n=owned(S,b.id);
    let label;
    if(!S.sellMode){
      const cnt=(S.buyAmt===100)?Math.max(1,Math.min(100,maxAffordable(b,n,S.bits))):S.buyAmt;
      label=bulkCost(b,n,cnt)+':'+cnt;
    }else label='s'+Math.min(S.buyAmt,n);
    sigParts.push(b.id,n,label);
  });
  const sig=sigParts.join('|');
  if(sig===storeSig) return;
  storeSig=sig;
  hideTip();
  // Upgrades
  const shelf=$('upgShelf'); shelf.innerHTML='';
  $('upgCount').textContent=vis.length?`${vis.length} verfügbar`:'';
  vis.slice(0,40).forEach(u=>{
    const d=document.createElement('div');
    d.className='upg'+(S.bits>=u.cost?' afford':'');
    d.textContent=u.icon;
    d.onclick=()=>buyUpg(u.id);
    bindTip(d,()=>upgTip(u));
    shelf.appendChild(d);
  });
  if(!vis.length) shelf.innerHTML='<span class="hint">Noch keine Upgrades — kaufe mehr Helfer!</span>';
  // Gebäude
  const box=$('buildings'); box.innerHTML='';
  BUILDINGS.forEach(b=>{
    const n=owned(S,b.id);
    const k=S.buyAmt;
    let price, label;
    if(!S.sellMode){
      const cnt=(k===100)?Math.max(1,Math.min(100,maxAffordable(b,n,S.bits))):k;
      price=bulkCost(b,n,cnt); label=`+${cnt} für 🪙 ${fmt(price)}`;
    }else{
      const cnt=Math.min(k,n);
      let refund=0;
      for(let i=0;i<cnt;i++) refund+=Math.ceil(b.cost*Math.pow(1.15,n-1-i)*0.5);
      price=-1; label=n>0?`−${cnt} für 🪙 ${fmt(refund)}`:'keine zum Verkaufen';
    }
    const afford=!S.sellMode&&S.bits>=price;
    const el=document.createElement('div');
    el.className='bcard'+(afford?' afford':'')+((!afford&&n===0)?' locked':'');
    const each=b.cps*Math.pow(2,bTierCount(S,b.id));
    el.innerHTML=`<div class="icon">${spriteHTML(b.file,b.icon,'')}</div>
      <div class="grow"><h3>${b.name}<span class="n">${n}</span></h3>
      <p>${b.desc}</p>
      <div class="cost${afford?'':' no'}">${label} · ⚡${fmt(each)}/s je</div></div>`;
    el.onclick=()=>buyBuilding(b);
    bindTip(el,()=>buildingTip(b));
    box.appendChild(el);
  });
}
function renderStats(){
  const rows=[
    ['Bits im Vorrat',fmt(S.bits)],
    ['Gebacken (Run)',fmt(S.total)],
    ['Gebacken (alle Zeit)',fmt(S.allTime)],
    ['Bits/Sekunde',fmt(calcCps(S,true))],
    ['Bits pro Klick',fmt(calcClick(S))],
    ['Klicks',fmt(S.clicks)],
    ['Helfer gesamt',fmt(totalBuildings(S))],
    ['Goldene Eier',S.goldenClicks],
    ['Viren zerplatzt',S.wrinklerPops],
    ['Milch',Math.floor(milkPct(S))+'%'],
    ['Himmels-Chips',`${S.chips} (je ${S.chipsTotal})`],
    ['Ascensions',S.ascensions],
    ['Spielzeit',fmtTime((Date.now()-S.startTime)/1000)],
  ];
  $('statList').innerHTML=rows.map(([a,b])=>`<li><span>${a}</span><b>${b}</b></li>`).join('');
}
function renderAch(){
  $('achGrid').innerHTML=ACH.map(a=>{
    const has=!!S.ach[a.id];
    return `<div class="ach ${has?'unlocked':'locked'}"><div class="ic">${has?a.icon:'🔒'}</div><b>${a.name}</b><small>${a.desc}</small></div>`;
  }).join('');
  $('achCount').textContent=`(${achCount(S)}/${ACH.length})`;
}
let ascSig='';
function renderAsc(){
  const earn=chipsEarnable(), fresh=earn-S.chipsTotal;
  $('ascInfo').innerHTML=`Alle Zeit gebacken: <b>🪙 ${fmt(S.allTime)}</b><br>`+
    (fresh>0?`Bereit: <b>+${fresh} 💠</b> bei Wiedergeburt.`:`Noch ${fmt(Math.pow(S.chipsTotal+1,3)*1e12-S.allTime)} Bits bis zum nächsten Chip.`);
  $('ascBtn').disabled=fresh<1;
  const sig=[S.chips,S.chipsTotal,Object.keys(S.hups).sort().join(',')].join('|');
  if(sig===ascSig) return;
  ascSig=sig;
  hideTip();
  const box=$('heavenList'); box.innerHTML='';
  if(S.chipsTotal===0&&S.chips===0){ box.innerHTML='<p class="hint">Steige erst auf, um Himmels-Upgrades freizuschalten.</p>'; return; }
  HEAVENLY.forEach(h=>{
    const has=!!S.hups[h.id], afford=!has&&S.chips>=h.cost;
    const el=document.createElement('div');
    el.className='bcard'+(afford?' afford':'');
    el.innerHTML=`<div class="icon">${h.icon}</div>
      <div class="grow"><h3>${h.name}${has?' ✅':''}</h3><p>${h.desc}</p>
      <div class="cost${afford?'':' no'}">${has?'aktiv':'💠 '+h.cost+' Chips'}</div></div>`;
    if(!has) el.onclick=()=>buyHeaven(h.id);
    bindTip(el,()=>heavenTip(h));
    box.appendChild(el);
  });
}
function renderWrinklers(){
  const box=$('wrinklers'); box.innerHTML='';
  const n=S.wrinklers.length;
  S.wrinklers.forEach((w,i)=>{
    const ang=(w.angle||0)+i*(Math.PI*2/Math.max(1,n));
    const x=50+42*Math.cos(ang), y=50+42*Math.sin(ang);
    const d=document.createElement('div');
    d.className='wrinkler'; d.style.left=x+'%'; d.style.top=y+'%';
    const sp=WRINKLER_SPRITES[i%WRINKLER_SPRITES.length];
    d.innerHTML=spriteHTML(sp[0],sp[1],'');
    d.title=`Hungriger Virus — ${fmt(w.stored)} Bits drin. Klicken zum Zerplatzen!`;
    d.onclick=(e)=>{e.stopPropagation();popWrinkler(i);};
    box.appendChild(d);
  });
}
function renderOpts(){
  $('soundBtn').textContent=S.sound?'🔊 Sound: AN':'🔇 Sound: AUS';
  $('partBtn').textContent=S.particles?'✨ Partikel: AN':'✨ Partikel: AUS';
  $('numBtn').textContent=S.numbers?'🔢 Zahlen: AN':'🔢 Zahlen: AUS';
  document.querySelectorAll('#buyBar [data-amt]').forEach(b=>
    b.classList.toggle('active',+b.dataset.amt===S.buyAmt));
  $('sellBtn').textContent='Verkaufen: '+(S.sellMode?'AN':'AUS');
  $('sellBtn').classList.toggle('off',!S.sellMode);
}
function renderAll(){ renderTop(); renderStore(); renderStats(); renderAch(); renderAsc(); renderOpts(); renderWrinklers(); renderDev(); }

/* ================= LOOP ================= */
let last=Date.now(), slowT=0, newsT=0;
function tick(){
  const now=Date.now(), dt=Math.min(1,(now-last)/1000); last=now;
  // Einkommen (Viren zapfen 5% je)
  const cps=calcCps(S,true), n=S.wrinklers.length;
  const gross=cps*dt, suck=gross*0.05*Math.min(8,n);
  const net=gross-suck;
  if(net>0){ S.bits+=net; S.total+=net; S.allTime+=net; }
  if(n>0){ const each=suck/n; S.wrinklers.forEach(w=>w.stored+=each); }
  if(cps>S.cpsPeak) S.cpsPeak=cps;
  // Buffs verfallen (Anzeige in renderTop)
  // Goldene Eier
  const g=$('golden');
  if(g.classList.contains('hidden')){
    if(now>=S.nextGolden) spawnGolden();
  }else if(now>S.goldenUntil){
    g.classList.add('hidden'); scheduleGolden();
  }
  // Viren-Nachschub
  if(S.ups.vswarm&&S.wrinklers.length<8&&now>=S.nextWrinkler){
    S.wrinklers.push({stored:0,angle:Math.random()*6.28});
    S.nextWrinkler=now+45000;
  }
  // Viren kreisen
  if(n>0){ S.wrinklers.forEach(w=>w.angle=(w.angle||0)+dt*0.15); renderWrinklers(); }
  renderTop();
  slowT+=dt;
  if(slowT>1){ slowT=0; checkAch(); renderStore(); renderStats(); renderAch(); renderAsc(); if(S.dev) renderDev(); save(); }
  newsT+=dt;
  if(newsT>12){ newsT=0; tickNews(); }
}
function tickNews(){
  const pool=NEWS.filter(x=>!x.c||x.c(S));
  $('tickerText').textContent=pool[Math.floor(Math.random()*pool.length)].t;
}
setInterval(tick,100);
setInterval(save,15000);

/* ================= EVENTS ================= */
function init(){
  S=load();
  if(!S.nextGolden) scheduleGolden();
  $('bigCookie').onclick=doClick;
  $('golden').onclick=collectGolden;
  document.querySelectorAll('#tabs button').forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.tabpage').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      $('tab-'+b.dataset.tab).classList.add('active');
    };
  });
  document.querySelectorAll('#buyBar [data-amt]').forEach(b=>{
    b.onclick=()=>{ S.buyAmt=+b.dataset.amt; renderOpts(); renderStore(); save(); };
  });
  $('sellBtn').onclick=()=>{ S.sellMode=!S.sellMode; renderOpts(); renderStore(); save(); };
  $('soundBtn').onclick=()=>{ S.sound=!S.sound; renderOpts(); save(); };
  $('partBtn').onclick=()=>{ S.particles=!S.particles; renderOpts(); save(); };
  $('numBtn').onclick=()=>{ S.numbers=!S.numbers; renderOpts(); save(); };
  $('saveBtn').onclick=()=>{ save(); toast('💾 Gespeichert!'); };
  $('exportBtn').onclick=()=>{ save(); prompt('Kopiere deinen Spielstand:',btoa(unescape(encodeURIComponent(JSON.stringify(S))))); };
  $('importBtn').onclick=()=>{
    const code=prompt('Füge deinen Spielstand-Code ein:'); if(!code) return;
    try{ S=Object.assign(freshState(),JSON.parse(decodeURIComponent(escape(atob(code))))); S.buffs=[];S.wrinklers=[];scheduleGolden(); save(); renderAll(); toast('📥 Spielstand geladen!'); }
    catch{ alert('Ungültiger Code!'); }
  };
  $('resetBtn').onclick=()=>{ if(confirm('Wirklich ALLES löschen (Hard Reset)?')){ localStorage.removeItem(SAVE_KEY); S=freshState(); scheduleGolden(); save(); renderAll(); } };
  $('ascBtn').onclick=ascend;
  initDev();
  document.addEventListener('keydown',e=>{
    if(/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if(e.code==='Space'){ e.preventDefault(); doClick(); }
    if(e.code==='F8'){ e.preventDefault(); toggleDev(); }
  });
  window.addEventListener('beforeunload',save);
  tickNews();
  renderAll();
}
document.addEventListener('DOMContentLoaded',init);

/* ---------- Keks-Hintergrund (sanfter Krümel-Regen) ---------- */
(function(){
  const c=$('matrix'), x=c.getContext('2d');
  let w,h,cols,drops;
  function rs(){ w=c.width=innerWidth; h=c.height=innerHeight; cols=Math.floor(w/28); drops=Array(cols).fill(0).map(()=>Math.random()*h/24); }
  addEventListener('resize',rs); rs();
  const chars='🍪🥚🍩✨';
  (function draw(){
    x.clearRect(0,0,w,h);
    x.font='18px serif';
    for(let i=0;i<cols;i++){
      if(Math.random()>0.985){
        const t=chars[Math.floor(Math.random()*chars.length)];
        x.globalAlpha=0.5;
        x.fillText(t,i*28,drops[i]*24);
        x.globalAlpha=1;
      }
      if(drops[i]*24>h&&Math.random()>0.975) drops[i]=0;
      drops[i]+=0.4;
    }
    requestAnimationFrame(draw);
  })();
})();
