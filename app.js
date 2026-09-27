const STORAGE_KEY="human-partner-v1";

const TRAITS={
  energy:["calme","équilibré·e","énergique"],
  sociability:["réservé·e","sélectif·ve","sociable"],
  directness:["diplomate","franc·he","très direct·e"],
  playfulness:["posé·e","taquin·e","très joueur·se"],
  organization:["spontané·e","souple","organisé·e"],
  affection:["discret·ète","tendre","très démonstratif·ve"],
  patience:["impatient·e","variable","patient·e"],
  independence:["très proche","équilibré·e","indépendant·e"],
  adventure:["casanier·ère","curieux·se","aventureux·se"]
};
const TYPES=[["femme","👩"],["homme","👨"],["non-binaire","🧑"],["androgyne / fluide","✨"]];
const ORIGINS=["Europe","Asie de l'Est","Monde arabe / Afrique du Nord","Afrique subsaharienne","Amérique du Nord","Amérique latine","Asie du Sud","métissé·e"];
const VALUES=["honnêteté","liberté","fidélité","famille","créativité","tranquillité","ambition","loyauté","curiosité","respect","indépendance","simplicité"];
const HUMORS=["taquin","pince-sans-rire","absurde","ironique léger","spontané"];
const JOBS=["salarié·e","indépendant·e","étudiant·e","en reconversion","en pause professionnelle","sur un projet personnel","sans envie particulière de carrière"];
const SPORT=["très sportif·ve","sportif·ve occasionnel·le","marche surtout","pas vraiment sportif·ve","déteste le sport","aimerait s'y remettre"];
const HOBBIES=["musique","cinéma","lecture","jeux vidéo","cuisine","photo","bricolage","voyage","mode","mécanique","technologie","nature","danse","dessin","aucun hobby précis"];
const MOODS=["calme","joyeux·se","fatigué·e","taquin·e","rêveur·se","motivé·e","grognon·ne","sensible","curieux·se","besoin de calme"];
const NAMES={
  femme:["Lina","Camille","Nora","Maya","Élise","Jade","Ana","Sofia"],
  homme:["Noah","Elias","Louis","Sam","Adam","Milo","Yanis","Leo"],
  "non-binaire":["Charlie","Sasha","Noa","Alex","Lou","Cam","Eden","Morgan"],
  "androgyne / fluide":["Ari","Sky","Robin","Sacha","Eden","Andrea","Lou","Charlie"]
};

let state=load();
let selected=new Set(state.interests||[]);

function rng(seed){
  let h=2166136261>>>0;
  for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  return()=>((h=Math.imul(h^(h>>>15),2246822519))>>>0)/4294967296;
}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
const sample=(r,arr,n)=>[...arr].sort(()=>r()-.5).slice(0,n);

function createPartner(interests){
  const seed=crypto.randomUUID(),r=rng(seed);
  const allowed=interests.length?TYPES.filter(([t])=>interests.includes(t)):TYPES;
  const [type,emoji]=pick(r,allowed);
  return{
    seed,type,emoji,name:pick(r,NAMES[type]),origin:pick(r,ORIGINS),
    personality:Object.fromEntries(Object.entries(TRAITS).map(([k,v])=>[k,pick(r,v)])),
    values:sample(r,VALUES,4),humor:pick(r,HUMORS),job:pick(r,JOBS),sport:pick(r,SPORT),
    hobbies:sample(r,HOBBIES,Math.floor(r()*4)),modesty:pick(r,["élevée","moyenne","faible"]),
    attachment:pick(r,["prudent","stable","indépendant","très proche une fois attaché"]),
    trust:12,affinity:8,stage:"premier contact",createdAt:Date.now(),messages:[]
  };
}

function getMood(partner){
  const day=new Date().toISOString().slice(0,10),r=rng(partner.seed+day);
  return{mood:pick(r,MOODS),energy:Math.floor(35+r()*61),affection:Math.floor(15+r()*71)};
}

function partnerReply(text){
  const p=state.partner,daily=getMood(p),lower=text.toLowerCase();
  let reply;
  if(/photo|photos|image|images/.test(lower)){
    const playful=p.personality.playfulness.includes("taquin")||p.personality.playfulness.includes("joueur");
    if(daily.energy<45) reply="Là franchement, j'ai pas trop envie de faire une séance photo 😅. Je t'en montrerais peut-être une ou deux, pas vingt.";
    else if(playful) reply="Des photos ? 😏 Combien exactement ? Parce que si tu me demandes vingt clichés, je vais commencer à croire que tu montes un dossier sur moi 😂";
    else if(p.modesty==="élevée") reply="Je veux bien t'en montrer quelques-unes, mais j'aime choisir celles que je partage. Je suis assez pudique là-dessus.";
    else reply="Oui, pourquoi pas. Mais je choisis lesquelles 😄. J'ai envie que ça me ressemble, pas de te balancer vingt images au hasard.";
  }else if(/sport/.test(lower)){
    reply="Pour te situer : "+p.sport+". Donc ne pars pas du principe que je vais courir un marathon avec toi demain 😄.";
  }else if(/travail|boulot|métier/.test(lower)){
    reply="Mon rapport au travail ? "+p.job+". Et ça dépend vraiment de mon humeur, je ne vis pas pour bosser.";
  }else if(/blague|drôle|rire/.test(lower)){
    reply=p.humor==="pince-sans-rire"?"Je te préviens, mon humour peut être tellement sec que parfois on ne sait même pas si je plaisante.":"J'aime rire, mais je vais pas faire semblant si ta blague est catastrophique 😂.";
  }else{
    const options=[
      "Je vois ce que tu veux dire. J'ai envie d'apprendre à te connaître avant de tirer des conclusions.",
      "Hmm… intéressant. Moi je ne suis pas du genre à dire oui juste pour faire plaisir, donc tu finiras forcément par découvrir mes désaccords 😄.",
      "Ça me donne envie de te poser une question en retour : qu'est-ce qui compte vraiment pour toi chez quelqu'un ?",
      "Je note. Mais je garde quand même ma propre opinion, sinon ce serait beaucoup trop facile 😉.",
      daily.mood==="fatigué·e"?"Je t'écoute, mais aujourd'hui mon cerveau tourne un peu au ralenti 😴.":"Continue, ça m'intéresse. Je suis curieux·se de voir où cette conversation nous mène."
    ];
    reply=pick(rng(p.seed+text+p.messages.length),options);
  }
  p.trust=Math.min(100,p.trust+1);p.affinity=Math.min(100,p.affinity+1);
  if(p.trust>70&&p.affinity>75)p.stage="attachement";
  else if(p.trust>45&&p.affinity>50)p.stage="affinité";
  else if(p.trust>22)p.stage="connaissance";
  return reply;
}

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{adult:false,interests:[],partner:null};}catch{return{adult:false,interests:[],partner:null};}}

function ageGate(){
  return '<div class="modal"><section class="card modal-card"><div class="badge">Accès adulte</div><h1>Cette application est réservée aux adultes.</h1><p class="muted">Le prototype utilise un contrôle d\'âge déclaratif. Un système d\'age assurance réel pourra être branché avant publication.</p><div class="actions"><button id="adultYes" class="primary">J\'ai 18 ans ou plus</button><button id="adultNo" class="secondary">Quitter</button></div></section></div>';
}

function onboarding(){
  const opts=TYPES.map(([t,e])=>'<button class="option '+(selected.has(t)?"active":"")+'" data-interest="'+t+'">'+e+' '+t+'</button>').join("");
  return '<div class="modal"><section class="card modal-card"><div class="badge">Première rencontre</div><h1>Qui peut t\'attirer ?</h1><p class="muted">On ne déduit pas ton orientation. Choisis simplement les types de personnes qui peuvent t\'intéresser.</p><div class="field"><div class="options">'+opts+'<button class="option '+(selected.has("personnalité")?"active":"")+'" data-interest="personnalité">💫 surtout la personnalité</button></div></div><div class="notice">La personnalité du personnage sera générée une seule fois puis restera stable. Ses humeurs et ses goûts pourront évoluer.</div><button id="createPartner" class="primary">Faire connaissance</button></section></div>';
}

function landing(){
  return '<section class="card hero"><h1>Une personne,<br>pas un bouton.</h1><p>Personnalité stable, humeur variable, relation progressive et décisions autonomes.</p></section>';
}

function dashboard(){
  const p=state.partner,d=getMood(p),traits=Object.values(p.personality);
  const visuals=[["Humeur actuelle",d.mood],["Maison • quotidien","tenue naturelle"],["Sortie","style adapté"],["Photo spontanée","selon son envie"],["Souvenir",p.stage],["Bibliothèque","index visuel"]];
  return '<div class="grid"><div><section class="card panel"><h2>Personnage</h2><div class="profile"><div class="avatar">'+p.emoji+'</div><div><div class="name">'+p.name+'</div><div class="muted">'+p.type+' • '+p.origin+'</div><div class="chips">'+traits.slice(0,5).map(x=>'<span class="chip">'+x+'</span>').join("")+'</div></div></div><div class="stats"><div class="stat"><strong>'+d.mood+'</strong><span>humeur</span></div><div class="stat"><strong>'+p.trust+'%</strong><span>confiance</span></div><div class="stat"><strong>'+p.stage+'</strong><span>relation</span></div></div></section><section class="card panel" style="margin-top:18px"><h2>Identité stable</h2><div class="chips">'+p.values.map(x=>'<span class="chip">valeur: '+x+'</span>').join("")+'<span class="chip">humour: '+p.humor+'</span><span class="chip">travail: '+p.job+'</span><span class="chip">sport: '+p.sport+'</span><span class="chip">pudeur: '+p.modesty+'</span></div><p class="muted">Hobbies : '+(p.hobbies.length?p.hobbies.join(", "):"aucun hobby particulier pour l'instant")+'.</p></section><section class="card panel" style="margin-top:18px"><h2>Bibliothèque visuelle</h2><div class="library">'+visuals.map(([a,b])=>'<div class="visual"><strong>'+a+'</strong><small>'+b+'</small></div>').join("")+'</div></section></div><section class="card chat"><div class="panel"><h2>Conversation</h2><div class="muted">Énergie '+d.energy+'% • envie d\'affection '+d.affection+'%</div></div><div id="messages" class="messages">'+(p.messages.length?p.messages.map(m=>'<div class="message '+m.role+'">'+escapeHtml(m.text)+'</div>').join(""):'<div class="message partner">Salut. On ne se connaît pas encore vraiment, donc je préfère qu\'on commence simplement 😄. Qu\'est-ce que tu veux savoir sur moi ?</div>')+'</div><form id="chatForm" class="composer"><input id="chatInput" autocomplete="off" placeholder="Écris-lui quelque chose…" /><button class="primary">Envoyer</button></form><div style="padding:0 14px 14px"><button id="reset" class="danger">Recommencer avec une autre personne</button></div></section></div>';
}

function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}

function render(){
  const app=document.querySelector("#app");
  app.innerHTML='<main class="shell"><div class="topbar"><div class="brand">Human Partner</div><div class="badge">Prototype local • mémoire navigateur</div></div>'+(!state.partner?landing():dashboard())+'</main>'+(!state.adult?ageGate():(!state.partner?onboarding():""));
  bind();
}

function bind(){
  document.querySelector("#adultYes")?.addEventListener("click",()=>{state.adult=true;save();render();});
  document.querySelector("#adultNo")?.addEventListener("click",()=>document.body.innerHTML="<main class='shell'><section class='card hero'><h1>Accès fermé.</h1></section></main>");
  document.querySelectorAll("[data-interest]").forEach(btn=>btn.addEventListener("click",()=>{const v=btn.dataset.interest;selected.has(v)?selected.delete(v):selected.add(v);render();}));
  document.querySelector("#createPartner")?.addEventListener("click",()=>{const interests=[...selected].filter(x=>x!=="personnalité");state.interests=[...selected];state.partner=createPartner(interests);save();render();});
  document.querySelector("#chatForm")?.addEventListener("submit",e=>{e.preventDefault();const input=document.querySelector("#chatInput"),text=input.value.trim();if(!text)return;state.partner.messages.push({role:"user",text});state.partner.messages.push({role:"partner",text:partnerReply(text)});save();render();setTimeout(()=>document.querySelector("#messages")?.scrollTo(0,99999),0);});
  document.querySelector("#reset")?.addEventListener("click",()=>{if(confirm("Supprimer ce personnage et recommencer ?")){state.partner=null;selected=new Set(state.interests||[]);save();render();}});
}

render();