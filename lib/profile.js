import crypto from "node:crypto";

const TRAITS={energy:["calme","équilibré·e","énergique"],sociability:["réservé·e","sélectif·ve","sociable"],directness:["diplomate","franc·he","très direct·e"],playfulness:["posé·e","taquin·e","très joueur·se"],organization:["spontané·e","souple","organisé·e"],affection:["discret·ète","tendre","très démonstratif·ve"],patience:["impatient·e","variable","patient·e"],independence:["très proche","équilibré·e","indépendant·e"],adventure:["casanier·ère","curieux·se","aventureux·se"]};
const TYPES=["femme","homme","non-binaire","androgyne / fluide"],ORIGINS=["Europe","Asie de l'Est","Monde arabe / Afrique du Nord","Afrique subsaharienne","Amérique du Nord","Amérique latine","Asie du Sud","métissé·e"];
const VALUES=["honnêteté","liberté","fidélité","famille","créativité","tranquillité","ambition","loyauté","curiosité","respect","indépendance","simplicité"],HUMORS=["taquin","pince-sans-rire","absurde","ironique léger","spontané"];
const JOBS=["salarié·e","indépendant·e","étudiant·e","en reconversion","en pause professionnelle","sur un projet personnel","sans envie particulière de carrière"],SPORT=["très sportif·ve","sportif·ve occasionnel·le","marche surtout","pas vraiment sportif·ve","déteste le sport","aimerait s'y remettre"];
const HOBBIES=["musique","cinéma","lecture","jeux vidéo","cuisine","photo","bricolage","voyage","mode","mécanique","technologie","nature","danse","dessin","aucun hobby précis"],MOODS=["calme","joyeux·se","fatigué·e","taquin·e","rêveur·se","motivé·e","grognon·ne","sensible","curieux·se","besoin de calme"];
const NAMES={"femme":["Lina","Camille","Nora","Maya","Élise","Jade","Ana","Sofia"],"homme":["Noah","Elias","Louis","Sam","Adam","Milo","Yanis","Leo"],"non-binaire":["Charlie","Sasha","Noa","Alex","Lou","Cam","Eden","Morgan"],"androgyne / fluide":["Ari","Sky","Robin","Sacha","Eden","Andrea","Lou","Charlie"]};
const normalizedName=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

function seeded(seed){let h=2166136261>>>0;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return()=>((h=Math.imul(h^(h>>>15),2246822519))>>>0)/4294967296}
const pick=(r,a)=>a[Math.floor(r()*a.length)],sample=(r,a,n)=>[...a].sort(()=>r()-.5).slice(0,n);

export function createProfile(interests=[],usedNames=[]){const seed=crypto.randomUUID(),r=seeded(seed),allowed=interests.length?TYPES.filter(x=>interests.includes(x)):TYPES,type=pick(r,allowed.length?allowed:TYPES),taken=new Set((usedNames||[]).map(normalizedName)),available=(NAMES[type]||[]).filter(n=>!taken.has(normalizedName(n)));let name=available.length?pick(r,available):pick(r,NAMES[type]);if(taken.has(normalizedName(name))){let i=2;while(taken.has(normalizedName(`${name} ${i}`)))i++;name=`${name} ${i}`;}const p={seed,type,name,origin:pick(r,ORIGINS),personality:Object.fromEntries(Object.entries(TRAITS).map(([k,v])=>[k,pick(r,v)])),values:sample(r,VALUES,4),humor:pick(r,HUMORS),job:pick(r,JOBS),sport:pick(r,SPORT),hobbies:sample(r,HOBBIES,Math.floor(r()*4)),modesty:pick(r,["élevée","moyenne","faible"]),attachment:pick(r,["prudent","stable","indépendant","très proche une fois attaché"]),trust:12,affinity:8,stage:"premier contact",createdAt:Date.now()};p.visualIdentity=buildVisualIdentity(p);return p}

export function buildVisualIdentity(p){
  const r=seeded(p.seed+":visual");
  const hairColors=["bruns","châtains","noirs","blonds","roux"];
  const eyeColors=["marron","noisette","verts","bleus","gris"];
  const hairLengths=p.type==="homme"?["courts","mi-longs","courts bouclés"]:["longs","mi-longs","au carré","longs ondulés","attachés"];
  const builds=["fine","moyenne","athlétique","douce"];
  const heights=["plutôt petite","de taille moyenne","plutôt grande"];
  return{hairColor:pick(r,hairColors),eyeColor:pick(r,eyeColors),hair:pick(r,hairLengths),build:pick(r,builds),height:pick(r,heights)};
}
export function ensureVisualIdentity(p){if(!p.visualIdentity)p.visualIdentity=buildVisualIdentity(p);return p}

export function dailyMood(p,date=new Date()){const day=date.toISOString().slice(0,10),r=seeded(p.seed+day);return{mood:pick(r,MOODS),energy:Math.floor(35+r()*61),affection:Math.floor(15+r()*71),social:Math.floor(20+r()*76),patience:Math.floor(25+r()*71)}}
export function advanceRelationship(p){p.trust=Math.min(100,p.trust+1);p.affinity=Math.min(100,p.affinity+1);if(p.trust>70&&p.affinity>75)p.stage="attachement";else if(p.trust>45&&p.affinity>50)p.stage="affinité";else if(p.trust>22)p.stage="connaissance";return p}
export function captureMemory(text){const t=text.trim();if(!t)return null;const l=t.toLowerCase();if(/\b(j'aime|j’adore|j'adore|je préfère|je déteste|mon travail|je travaille|j'habite|j’habite|je suis)\b/.test(l))return{kind:"user_fact",content:t,weight:3};if(/\b(promis|important|souviens|rappelle)\b/.test(l))return{kind:"important",content:t,weight:4};return t.length>180?{kind:"context",content:t,weight:1}:null}
export function visualDecision(p,mood,text){const l=text.toLowerCase(),wantsMany=(l.match(/\b(10|20|30|50|100)\b/)||[])[0],playful=p.personality.playfulness.includes("taquin")||p.personality.playfulness.includes("joueur");if(mood.energy<40)return{accept:true,count:1,text:"Là, j’ai pas trop envie d’une grosse séance photo 😅. Une ou deux, pas plus."};if(p.modesty==="élevée"&&p.stage==="premier contact")return{accept:true,count:2,text:"Je veux bien, mais je préfère choisir moi-même ce que je montre. On se connaît à peine."};if(wantsMany&&playful)return{accept:true,count:5,text:`${wantsMany} photos carrément ? 😂 Je t’en choisis 5 pour commencer, après on verra.`};return{accept:true,count:Math.min(6,Number(wantsMany)||3),text:"Oui, mais je choisis lesquelles. J’ai envie que ça me ressemble, pas de t’envoyer des images au hasard."}}
