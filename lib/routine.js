import crypto from "node:crypto";
import { db,getSetting,setSetting,addMemory } from "./db.js";

function seeded(seed){const h=crypto.createHash("sha256").update(seed).digest();let i=0;return()=>h.readUInt32BE((i++%7)*4)/0xffffffff}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

const CONTACT_NAMES=["Léa","Sarah","Emma","Inès","Manon","Chloé","Lucas","Nolan","Tom","Nina","Alex","Sam","Milo","Lou","Noa","Jules"];
const RELATIONS=["ami·e proche","ami·e","collègue","connaissance","cousin·e"];
const ENERGIES=["calme","bavard·e","drôle","posé·e","spontané·e","intense"];
const GOAL_POOL=[
  ["prendre davantage soin de soi","bien-être"],
  ["mettre de l'argent de côté","argent"],
  ["apprendre quelque chose de nouveau","apprentissage"],
  ["mieux organiser ses semaines","organisation"],
  ["faire un voyage qui lui tient à cœur","voyage"],
  ["développer un projet personnel","projet"],
  ["retrouver une activité régulière","loisir"],
  ["améliorer son équilibre travail/vie perso","équilibre"],
  ["voir plus souvent les gens qui comptent","social"],
  ["aménager un chez-soi qui lui ressemble","maison"]
];

export function ensureRoutine(profile){
  let routine=getSetting("routineProfile",null);
  if(routine)return routine;
  const r=seeded(profile.seed+":routine");
  const early=profile.personality.energy==="énergique"&&r()>0.45;
  const wakeHour=early?pick(r,[6,7,8]):pick(r,[7,8,9]);
  const sleepHour=pick(r,[22,23,24]);
  routine={
    wakeHour,
    sleepHour,
    workStart:profile.job==="sans envie particulière de carrière"||profile.job==="en pause professionnelle"?null:pick(r,[8,9,10]),
    workHours:profile.job==="étudiant·e"?pick(r,[4,5,6]):pick(r,[6,7,8]),
    mealStyle:pick(r,["régulier","variable","grignote parfois","aime prendre son temps"]),
    aloneTime:pick(r,["important","modéré","faible"]),
    weekendStyle:pick(r,["repos","sorties","improvisation","projets perso","famille et proches"])
  };
  setSetting("routineProfile",routine);
  return routine;
}

export function ensureSocialCircle(profile){
  const count=db.prepare("SELECT COUNT(*) c FROM social_contacts").get().c;
  if(count)return listContacts();
  const r=seeded(profile.seed+":social");
  const n=profile.personality.sociability==="sociable"?5:profile.personality.sociability==="réservé·e"?2:3;
  const used=new Set();
  for(let i=0;i<n;i++){
    let name=pick(r,CONTACT_NAMES);while(used.has(name))name=pick(r,CONTACT_NAMES);used.add(name);
    db.prepare("INSERT INTO social_contacts(name,relation,closeness,energy,created_at) VALUES(?,?,?,?,?)")
      .run(name,pick(r,RELATIONS),Math.floor(35+r()*61),pick(r,ENERGIES),Date.now());
  }
  return listContacts();
}

export function ensureGoals(profile){
  const count=db.prepare("SELECT COUNT(*) c FROM goals").get().c;
  if(count)return listGoals();
  const r=seeded(profile.seed+":goals");
  const candidates=[...GOAL_POOL];
  if(profile.values.includes("ambition"))candidates.push(["faire progresser sa situation professionnelle","travail"]);
  if(profile.values.includes("famille"))candidates.push(["préserver du temps pour ses proches","famille"]);
  if(profile.values.includes("créativité"))candidates.push(["mener un projet créatif jusqu'au bout","créatif"]);
  for(const [title,category] of candidates.sort(()=>r()-.5).slice(0,3)){
    db.prepare("INSERT OR IGNORE INTO goals(title,category,progress,priority,status,updated_at) VALUES(?,?,?,?,?,?)")
      .run(title,category,Math.floor(r()*21),Math.floor(1+r()*3),"active",Date.now());
  }
  return listGoals();
}

export function listContacts(){return db.prepare("SELECT name,relation,closeness,energy FROM social_contacts ORDER BY closeness DESC").all()}
export function listGoals(){return db.prepare("SELECT id,title,category,progress,priority,status,updated_at FROM goals WHERE status='active' ORDER BY priority DESC, progress ASC").all()}

export function currentRoutineState(profile,mood,date=new Date()){
  const routine=ensureRoutine(profile);
  const hour=date.getHours(),day=date.getDay(),weekend=day===0||day===6;
  let activity="temps perso",availability="disponible",attention=80;

  const sleepStart=routine.sleepHour===24?24:routine.sleepHour;
  if(hour<routine.wakeHour || hour>=sleepStart){activity="sommeil";availability="indisponible";attention=5}
  else if(!weekend&&routine.workStart!==null&&hour>=routine.workStart&&hour<routine.workStart+routine.workHours){
    activity=profile.job.includes("étudiant")?"cours / études":"travail / projet";
    availability="occupé·e";attention=30;
  }else if((hour>=12&&hour<14)||(hour>=19&&hour<21)){activity="repas / pause";availability="plutôt disponible";attention=65}
  else if(weekend&&routine.weekendStyle==="sorties"&&hour>=15&&hour<21){activity="sortie";availability="variable";attention=45}
  else if(mood.energy<40){activity="repos";availability="plutôt disponible";attention=55}
  else if(hour>=17&&hour<22){activity="temps personnel";availability="disponible";attention=85}

  return{...routine,activity,availability,attention,weekend,hour};
}

export function maybeSocialEvent(profile,mood,date=new Date()){
  const key=`socialEvent:${date.toISOString().slice(0,10)}`;
  const existing=getSetting(key,null);if(existing)return existing;
  const contacts=ensureSocialCircle(profile),r=seeded(profile.seed+key);
  if(mood.social<45||r()>0.52){const none={planned:false};setSetting(key,none);return none}
  const c=pick(r,contacts),hour=pick(r,[18,19,20,21]);
  const event={planned:true,with:c.name,relation:c.relation,hour,kind:pick(r,["boire un verre","manger ensemble","passer dire bonjour","faire une balade","regarder quelque chose ensemble"])};
  setSetting(key,event);return event;
}

export function progressGoals(profile,mood,date=new Date()){
  ensureGoals(profile);
  const key=`goalProgress:${date.toISOString().slice(0,10)}`;
  if(getSetting(key,false))return listGoals();
  const r=seeded(profile.seed+key);
  const goals=listGoals();
  if(goals.length&&mood.energy>45){
    const g=pick(r,goals),inc=Math.floor(1+r()*5);
    db.prepare("UPDATE goals SET progress=?,updated_at=? WHERE id=?").run(clamp(g.progress+inc,0,100),Date.now(),g.id);
    addMemory("goal_progress",`A avancé sur son objectif : ${g.title}.`,2);
  }
  setSetting(key,true);return listGoals();
}

export function lifeContext(profile,mood,date=new Date()){
  const routine=currentRoutineState(profile,mood,date);
  const contacts=ensureSocialCircle(profile);
  const social=maybeSocialEvent(profile,mood,date);
  const goals=progressGoals(profile,mood,date);
  return{routine,contacts,social,goals};
}
