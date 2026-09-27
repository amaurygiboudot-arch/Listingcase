import { db,getSetting,setSetting,addMemory,recentMemories } from "./db.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function classifyEvent(text){
  const t=text.trim(),l=t.toLowerCase();
  if(!t)return null;
  if(/\b(je t'aime|je t’adore|tu me manques|je tiens à toi)\b/.test(l))return{kind:"affection",weight:4,valence:3};
  if(/\b(désolé|pardon|excuse)\b/.test(l))return{kind:"repair",weight:4,valence:2};
  if(/\b(mensonge|menti|trahi|trompé|infidélité)\b/.test(l))return{kind:"trust_damage",weight:5,valence:-5};
  if(/\b(ferme-la|ta gueule|connard|connasse|idiot|idiote)\b/.test(l))return{kind:"conflict",weight:5,valence:-4};
  if(/\b(promis|promesse|important|souviens|rappelle)\b/.test(l))return{kind:"important",weight:4,valence:0};
  if(/\b(j'aime|j’adore|j'adore|je préfère|je déteste|je travaille|j'habite|j’habite|je suis)\b/.test(l))return{kind:"user_fact",weight:3,valence:0};
  if(t.length>180)return{kind:"context",weight:1,valence:0};
  return null;
}

export function recordEvent(text){
  const c=classifyEvent(text);if(!c)return null;
  addMemory(c.kind,text,c.weight);
  if(c.valence){
    const emotional=getSetting("emotionalState",{warmth:0,irritation:0,hurt:0});
    emotional.warmth=clamp(emotional.warmth+c.valence,-100,100);
    emotional.irritation=clamp(emotional.irritation+(c.valence<0?Math.abs(c.valence)*3:-1),0,100);
    emotional.hurt=clamp(emotional.hurt+(c.valence<=-4?10:c.valence>0?-2:0),0,100);
    setSetting("emotionalState",emotional);
  }
  return c;
}

export function noteInteraction(now=Date.now()){
  const prev=getSetting("lastInteractionAt",null);
  setSetting("lastInteractionAt",now);
  return prev;
}

export function absenceState(partner,now=Date.now()){
  const last=getSetting("lastInteractionAt",null);
  if(!last)return{days:0,effect:"none",deltaAffinity:0,deltaTrust:0,note:null};
  const days=(now-last)/86400000;
  if(days<1.5)return{days,effect:"none",deltaAffinity:0,deltaTrust:0,note:null};
  const independence=partner?.personality?.independence||"équilibré·e";
  if(days<4)return{days,effect:"noticed",deltaAffinity:0,deltaTrust:0,note:"L'absence de quelques jours a été remarquée."};
  if(independence==="indépendant·e")return{days,effect:"calm",deltaAffinity:-1,deltaTrust:0,note:"L'absence a été remarquée mais peu dramatisée."};
  if(days<10)return{days,effect:"distance",deltaAffinity:-2,deltaTrust:-1,note:"Le silence prolongé crée une légère distance émotionnelle."};
  return{days,effect:"cold",deltaAffinity:-4,deltaTrust:-2,note:"La longue absence a refroidi un peu la proximité."};
}

export function applyAbsence(partner,now=Date.now()){
  const a=absenceState(partner,now);
  if(a.deltaAffinity||a.deltaTrust){
    partner.affinity=clamp((partner.affinity||0)+a.deltaAffinity,0,100);
    partner.trust=clamp((partner.trust||0)+a.deltaTrust,0,100);
  }
  return a;
}

export function emotionalOverlay(){
  const e=getSetting("emotionalState",{warmth:0,irritation:0,hurt:0});
  return{
    ...e,
    tone:e.hurt>40?"blessé":e.irritation>45?"agacé":e.warmth>35?"chaleureux":"neutre"
  };
}

export function decayEmotions(){
  const e=getSetting("emotionalState",{warmth:0,irritation:0,hurt:0});
  const next={warmth:Math.trunc(e.warmth*.92),irritation:Math.trunc(e.irritation*.80),hurt:Math.trunc(e.hurt*.94)};
  setSetting("emotionalState",next);return next;
}

export function memoryContext(limit=18){
  return recentMemories(limit).map(m=>({kind:m.kind,content:m.content,weight:m.weight,ageDays:Math.floor((Date.now()-m.created_at)/86400000)}));
}

export function initiativeDecision(partner,mood){
  const last=getSetting("lastInitiativeAt",0),hours=(Date.now()-last)/3600000;
  if(hours<6)return{should:false,reason:"cooldown"};
  const e=emotionalOverlay();
  let score=0;
  if(mood.social>65)score+=2;
  if(mood.energy>60)score+=1;
  if(mood.affection>60)score+=2;
  if(e.hurt>45)score+=1;
  if(partner.stage==="affinité"||partner.stage==="attachement")score+=2;
  if(score<4)return{should:false,reason:"not_in_mood"};
  const kinds=e.hurt>45?["clarify","distance"]:mood.affection>70?["attention","photo","question"]:["question","idea","humor"];
  const kind=kinds[Math.floor(Math.random()*kinds.length)];
  setSetting("lastInitiativeAt",Date.now());
  return{should:true,kind,reason:"personality_and_mood"};
}
