import crypto from "node:crypto";
import { db,addMemory,getSetting,setSetting } from "./db.js";
import { evolvePreference,getPreference,preferenceLabel } from "./preferences.js";

const TOPICS=[
  {topic:"musique",kind:"découverte",tags:["creative","calm"]},
  {topic:"films",kind:"découverte",tags:["calm","indoor"]},
  {topic:"lecture",kind:"découverte",tags:["calm","indoor"]},
  {topic:"cuisine",kind:"essai",tags:["creative","indoor"]},
  {topic:"nature",kind:"sortie",tags:["outdoor","calm"]},
  {topic:"voyage",kind:"projection",tags:["adventure","outdoor"]},
  {topic:"sport",kind:"essai",tags:["active"]},
  {topic:"mécanique",kind:"découverte",tags:["technical","hands"]},
  {topic:"technologie",kind:"découverte",tags:["technical","indoor"]},
  {topic:"mode",kind:"essai",tags:["creative","social"]},
  {topic:"photo",kind:"essai",tags:["creative","outdoor"]},
  {topic:"danse",kind:"essai",tags:["active","social"]},
  {topic:"bricolage",kind:"essai",tags:["hands","technical"]},
  {topic:"jeux vidéo",kind:"découverte",tags:["indoor","playful"]}
];

function seeded(seed){
  const h=crypto.createHash("sha256").update(seed).digest();
  let i=0;
  return()=>{const n=h.readUInt32BE((i++%7)*4);return n/0xffffffff}
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const pick=(r,a)=>a[Math.floor(r()*a.length)];

function slotKey(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
  const block=Math.floor(date.getHours()/6);
  return `${y}-${m}-${d}-${block}`;
}

function personalityBias(profile,item){
  const p=profile.personality||{};
  let b=0;
  if(item.tags.includes("adventure")){
    if(p.adventure==="aventureux·se")b+=18;
    if(p.adventure==="casanier·ère")b-=14;
  }
  if(item.tags.includes("active")){
    if(profile.sport?.includes("très sportif"))b+=18;
    if(profile.sport?.includes("déteste"))b-=24;
  }
  if(item.tags.includes("social")){
    if(p.sociability==="sociable")b+=12;
    if(p.sociability==="réservé·e")b-=8;
  }
  if(item.tags.includes("playful")&&p.playfulness?.includes("joueur"))b+=10;
  if(item.tags.includes("calm")&&p.energy==="calme")b+=8;
  if(item.tags.includes("creative")&&profile.values?.includes("créativité"))b+=14;
  if(item.tags.includes("technical")&&profile.values?.includes("curiosité"))b+=8;
  return b;
}

function chooseTopic(profile,mood,slot){
  const r=seeded(profile.seed+slot);
  const scored=TOPICS.map(item=>{
    const pref=getPreference("partner",item.topic);
    let s=50+personalityBias(profile,item);
    if(pref)s+=Math.trunc(pref.score*0.18);
    if(item.tags.includes("active"))s+=Math.trunc((mood.energy-50)*0.35);
    if(item.tags.includes("social"))s+=Math.trunc((mood.social-50)*0.25);
    if(item.tags.includes("calm"))s+=Math.trunc((50-mood.energy)*0.15);
    s+=Math.floor((r()-.5)*26);
    return{item,score:s};
  }).sort((a,b)=>b.score-a.score);
  const top=scored.slice(0,4);
  return pick(r,top).item;
}

function evaluate(profile,mood,item,slot){
  const r=seeded(profile.seed+slot+":eval");
  const pref=getPreference("partner",item.topic);
  let score=(pref?.score||0)*0.4+personalityBias(profile,item);
  score+=(mood.energy-50)*0.18+(mood.patience-50)*0.08;
  score+=(r()-.5)*55;
  if(score>=28)return{outcome:"positif",delta:clamp(Math.round(8+score/7),8,22),intensity:clamp(Math.round(55+score/3),55,95)};
  if(score<=-22)return{outcome:"négatif",delta:-clamp(Math.round(8+Math.abs(score)/7),8,22),intensity:clamp(Math.round(50+Math.abs(score)/3),50,95)};
  return{outcome:"mitigé",delta:score>=0?3:-3,intensity:clamp(Math.round(35+Math.abs(score)/3),35,60)};
}

function noteFor(topic,outcome,label){
  if(outcome==="positif")return `Elle a passé un bon moment avec ${topic}. Sa préférence devient ${label}.`;
  if(outcome==="négatif")return `L'expérience autour de ${topic} ne lui a pas vraiment plu. Sa préférence devient ${label}.`;
  return `Elle a essayé ou découvert ${topic}, sans avis très tranché. Sa préférence reste ${label}.`;
}

export function latestExperiences(limit=12){
  return db.prepare("SELECT id,slot,topic,kind,outcome,intensity,note,created_at FROM experiences ORDER BY id DESC LIMIT ?").all(limit);
}

export function runLifeTick(profile,mood,now=new Date()){
  const slot=slotKey(now);
  const existing=db.prepare("SELECT * FROM experiences WHERE slot=?").get(slot);
  if(existing)return{created:false,experience:existing};

  const last=getSetting("lastInteractionAt",0);
  const hoursSinceInteraction=(Date.now()-last)/3600000;
  const r=seeded(profile.seed+slot+":gate");
  const activeChance=hoursSinceInteraction>2?0.78:0.36;
  if(r()>activeChance){
    setSetting("lastLifeTickAt",Date.now());
    return{created:false,experience:null,reason:"quiet_slot"};
  }

  const item=chooseTopic(profile,mood,slot);
  const result=evaluate(profile,mood,item,slot);
  const evolved=evolvePreference({
    owner:"partner",
    topic:item.topic,
    delta:result.delta,
    reason:`Expérience autonome: ${item.kind} (${result.outcome})`,
    confidenceDelta:result.outcome==="mitigé"?0.04:0.09
  });
  const label=preferenceLabel(evolved.score);
  const note=noteFor(item.topic,result.outcome,label);

  db.prepare("INSERT INTO experiences(slot,topic,kind,outcome,intensity,note,created_at) VALUES(?,?,?,?,?,?,?)")
    .run(slot,item.topic,item.kind,result.outcome,result.intensity,note,Date.now());

  addMemory("experience",note,result.outcome==="mitigé"?2:3);
  setSetting("lastLifeTickAt",Date.now());
  setSetting("pendingExperienceStory",{topic:item.topic,outcome:result.outcome,note,createdAt:Date.now(),told:false});

  return{created:true,experience:db.prepare("SELECT * FROM experiences WHERE slot=?").get(slot),preference:evolved};
}

export function pendingExperienceStory(){
  return getSetting("pendingExperienceStory",null);
}

export function markExperienceTold(){
  const p=getSetting("pendingExperienceStory",null);
  if(!p)return null;
  const next={...p,told:true,toldAt:Date.now()};
  setSetting("pendingExperienceStory",next);
  return next;
}
