import crypto from "node:crypto";
import { db } from "./db.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)));
const parse=(value,fallback)=>{
  try{return JSON.parse(value)}catch{return fallback}
};
const stableSeed=(profile,kind)=>{
  const raw=`${profile.personId}:${profile.seed||""}:${kind}`;
  return `${kind}-${crypto.createHash("sha256").update(raw).digest("hex").slice(0,12).toUpperCase()}`;
};
const safeId=profile=>String(profile?.personId||"").trim();

function preferenceCategory(topic=""){
  const t=String(topic).toLowerCase();
  if(/cuisine|restaurant|manger|café|cafe/.test(t))return"food";
  if(/musique|rock|rap|jazz|pop|electro/.test(t))return"music";
  if(/film|cinéma|cinema|série|serie/.test(t))return"films";
  if(/sport|fitness|course|vélo|velo|natation/.test(t))return"sport";
  if(/actualité|actualite|politique|économie|economie|environnement/.test(t))return"news_topics";
  return"interests";
}

function ensureFamily(familyId){
  if(!familyId)return;
  const now=Date.now();
  db.prepare(`INSERT OR IGNORE INTO families(family_id,family_history_json,common_traits_json,created_at,updated_at)
    VALUES(?,?,?,?,?)`).run(familyId,"{}","{}",now,now);
}
function ensureBase(profile){
  const personId=safeId(profile);if(!personId)return null;
  const familyId=profile.familyId??profile.family_id??null;
  ensureFamily(familyId);
  let row=db.prepare("SELECT * FROM living_identity WHERE person_id=?").get(personId);
  if(!row){
    const now=Date.now();
    const origin={
      declared:profile.origin||null,
      source_profile:profile.sourceProfile||null,
      family_traits:{}
    };
    const personality={
      stable:{...(profile.personality||{})},
      numeric_traits:{},
      last_deep_change_at:null
    };
    const past={
      childhood_events:[],
      school_events:[],
      relationships:[],
      important_memories:[]
    };
    db.prepare(`INSERT INTO living_identity
      (person_id,family_id,individual_seed,temperament_seed,origin_json,personality_json,past_json,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(personId,familyId,stableSeed(profile,"I"),stableSeed(profile,"T"),
        JSON.stringify(origin),JSON.stringify(personality),JSON.stringify(past),now,now);
    row=db.prepare("SELECT * FROM living_identity WHERE person_id=?").get(personId);
  }
  const personality=parse(row.personality_json,{stable:{},numeric_traits:{}});
  const nextStable={...personality.stable,...(profile.personality||{})};
  const nextFamily=row.family_id||familyId||null;
  if(JSON.stringify(nextStable)!==JSON.stringify(personality.stable)||nextFamily!==row.family_id){
    personality.stable=nextStable;
    db.prepare("UPDATE living_identity SET family_id=?,personality_json=?,updated_at=? WHERE person_id=?")
      .run(nextFamily,JSON.stringify(personality),Date.now(),personId);
    row=db.prepare("SELECT * FROM living_identity WHERE person_id=?").get(personId);
  }
  db.prepare(`INSERT OR IGNORE INTO living_current_state
    (person_id,mood,energy,stress,social_need,active_needs_json,active_interests_json,updated_at)
    VALUES(?,?,?,?,?,?,?,?)`)
    .run(personId,null,null,null,null,"[]","[]",Date.now());
  return row;
}

export function ensureLivingIdentity(profile){
  const row=ensureBase(profile);if(!row)return null;
  return{
    personId:row.person_id,
    familyId:row.family_id||null,
    individualSeed:row.individual_seed,
    temperamentSeed:row.temperament_seed
  };
}

export function updateLivingCurrentState(profile,{mood=null,stress=null,activeNeeds=null}={}){
  const row=ensureBase(profile);if(!row)return null;
  const current=db.prepare("SELECT * FROM living_current_state WHERE person_id=?").get(row.person_id);
  const energy=Number.isFinite(mood?.energy)?clamp(mood.energy/100,0,1):current.energy;
  const social=Number.isFinite(mood?.social)?clamp(mood.social/100,0,1):current.social_need;
  const nextStress=Number.isFinite(stress)?clamp(stress,0,1):current.stress;
  db.prepare(`UPDATE living_current_state SET mood=?,energy=?,stress=?,social_need=?,
    active_needs_json=?,updated_at=? WHERE person_id=?`)
    .run(mood?.mood??current.mood,energy,nextStress,social,
      JSON.stringify(Array.isArray(activeNeeds)?activeNeeds:parse(current.active_needs_json,[])),
      Date.now(),row.person_id);
  return db.prepare("SELECT * FROM living_current_state WHERE person_id=?").get(row.person_id);
}
function addLivingMemory(profile,{kind="event",content,emotionalWeight=0.2,certainty=1,source="conversation"}={}){
  const personId=safeId(profile);if(!personId||!content)return null;
  const existing=db.prepare(`SELECT memory_id FROM living_memories
    WHERE person_id=? AND kind=? AND content=? ORDER BY created_at DESC LIMIT 1`)
    .get(personId,kind,String(content));
  if(existing)return existing.memory_id;
  const memoryId=`MEM_${personId}_${crypto.randomUUID().slice(0,12)}`;
  db.prepare(`INSERT INTO living_memories
    (memory_id,person_id,kind,content,emotional_weight,certainty,source,created_at)
    VALUES(?,?,?,?,?,?,?,?)`)
    .run(memoryId,personId,kind,String(content).slice(0,1200),
      clamp(emotionalWeight,0,1),clamp(certainty,0,1),source,Date.now());
  return memoryId;
}

export function recordLivingEvent(profile,{
  category="context",description,emotion=null,intensity=0,importance=0.2,
  people=["user"],consequences=null,relationImpact={},personalityImpact={},
  certainty=1,source="conversation",happenedAt=Date.now()
}={}){
  const row=ensureBase(profile);if(!row||!description)return null;
  const eventId=`EVT_${row.person_id}_${crypto.randomUUID().slice(0,12)}`;
  db.prepare(`INSERT INTO living_events
    (event_id,person_id,happened_at,category,people_json,description,emotion,intensity,importance,
     consequences,relation_impact_json,personality_impact_json,certainty,source)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(eventId,row.person_id,happenedAt,category,JSON.stringify(people||[]),
      String(description).slice(0,1600),emotion,clamp(intensity,0,1),clamp(importance,0,1),
      consequences,JSON.stringify(relationImpact||{}),JSON.stringify(personalityImpact||{}),
      clamp(certainty,0,1),source);
  if(importance>=0.5){
    addLivingMemory(profile,{kind:category,content:description,
      emotionalWeight:importance,certainty,source});
  }
  return eventId;
}
export function recordClassifiedLivingEvent(profile,text,classification){
  if(!classification)return null;
  const importance=clamp((classification.weight||1)/5,0.1,1);
  const valence=Number(classification.valence||0);
  const emotion=valence>0?"positive":valence<0?"negative":"neutral";
  return recordLivingEvent(profile,{
    category:classification.kind||"context",
    description:String(text||"").trim(),
    emotion,
    intensity:clamp(Math.abs(valence)/5,0,1),
    importance,
    source:"user_conversation",
    certainty:1
  });
}

function recordEvolution(personId,type,change,causeEventId=null){
  db.prepare(`INSERT INTO living_evolution
    (person_id,change_type,change_json,cause_event_id,created_at)
    VALUES(?,?,?,?,?)`)
    .run(personId,type,JSON.stringify(change||{}),causeEventId,Date.now());
}

export function syncLivingPreference(profile,legacyPreference,evidenceText=""){
  const row=ensureBase(profile);
  if(!row||!legacyPreference?.topic)return null;
  const category=preferenceCategory(legacyPreference.topic);
  const value=String(legacyPreference.topic).trim().toLowerCase();
  const prev=db.prepare(`SELECT * FROM living_preferences
    WHERE person_id=? AND category=? AND value=?`).get(row.person_id,category,value);
  const now=Date.now();
  const strength=clamp(Number(legacyPreference.score||0)/100,-1,1);
  const evidenceCount=Math.max(Number(prev?.evidence_count||0),Number(legacyPreference.exposures||1));
  db.prepare(`INSERT INTO living_preferences
    (person_id,category,value,strength,evidence_count,reason,first_observed_at,last_confirmed_at)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(person_id,category,value) DO UPDATE SET
      strength=excluded.strength,evidence_count=excluded.evidence_count,
      reason=excluded.reason,last_confirmed_at=excluded.last_confirmed_at`)
    .run(row.person_id,category,value,strength,evidenceCount,
      String(evidenceText||legacyPreference.reason||"").slice(0,500),
      prev?.first_observed_at||now,now);
  recordEvolution(row.person_id,"preference_evidence",
    {category,value,strength,evidenceCount},null);
  return db.prepare(`SELECT * FROM living_preferences
    WHERE person_id=? AND category=? AND value=?`).get(row.person_id,category,value);
}
export function applyLivingDelta(profile,delta={},causeEventId=null){
  const row=ensureBase(profile);if(!row)return{applied:[],rejected:["missing_person_id"]};
  const applied=[],rejected=[];
  if(delta.current_state&&typeof delta.current_state==="object"){
    const allowed={};
    if(typeof delta.current_state.mood==="string")allowed.mood=delta.current_state.mood.slice(0,80);
    for(const key of ["energy","stress","social_need"]){
      if(Number.isFinite(delta.current_state[key]))allowed[key]=clamp(delta.current_state[key],0,1);
    }
    const current=db.prepare("SELECT * FROM living_current_state WHERE person_id=?").get(row.person_id);
    db.prepare(`UPDATE living_current_state SET mood=?,energy=?,stress=?,social_need=?,updated_at=?
      WHERE person_id=?`).run(
      allowed.mood??current.mood,
      allowed.energy??current.energy,
      allowed.stress??current.stress,
      allowed.social_need??current.social_need,
      Date.now(),row.person_id
    );
    recordEvolution(row.person_id,"current_state_delta",allowed,causeEventId);
    applied.push("current_state");
  }
  if(delta.new_memory?.content){
    addLivingMemory(profile,{
      kind:delta.new_memory.type||"memory",
      content:delta.new_memory.content,
      emotionalWeight:clamp(delta.new_memory.importance??0.25,0,1),
      certainty:clamp(delta.new_memory.certainty??1,0,1),
      source:delta.new_memory.source||"generated_delta"
    });
    recordEvolution(row.person_id,"new_memory",delta.new_memory,causeEventId);
    applied.push("new_memory");
  }
  if(delta.preference_evidence?.value){
    const pe=delta.preference_evidence;
    const category=String(pe.category||preferenceCategory(pe.value)).slice(0,80);
    const value=String(pe.value).trim().toLowerCase().slice(0,160);
    const prev=db.prepare(`SELECT * FROM living_preferences
      WHERE person_id=? AND category=? AND value=?`).get(row.person_id,category,value);
    const evidenceCount=(prev?.evidence_count||0)+1;
    const step=clamp(pe.delta??0,-0.15,0.15);
    const strength=clamp((prev?.strength||0)+step/(1+Math.max(0,evidenceCount-1)*0.2),-1,1);
    const now=Date.now();
    db.prepare(`INSERT INTO living_preferences
      (person_id,category,value,strength,evidence_count,reason,first_observed_at,last_confirmed_at)
      VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(person_id,category,value) DO UPDATE SET
        strength=excluded.strength,evidence_count=excluded.evidence_count,
        reason=excluded.reason,last_confirmed_at=excluded.last_confirmed_at`)
      .run(row.person_id,category,value,strength,evidenceCount,
        String(pe.reason||"").slice(0,500),prev?.first_observed_at||now,now);
    recordEvolution(row.person_id,"preference_evidence",
      {category,value,strength,evidenceCount},causeEventId);
    applied.push("preference_evidence");
  }
  if(delta.personality_delta&&typeof delta.personality_delta==="object"){
    const personality=parse(row.personality_json,{stable:{},numeric_traits:{}});
    const numeric=personality.numeric_traits||{};
    const accepted={};
    for(const [trait,raw] of Object.entries(delta.personality_delta)){
      if(!Object.prototype.hasOwnProperty.call(numeric,trait)){rejected.push(`unknown_trait:${trait}`);continue}
      const change=Number(raw);
      if(!Number.isFinite(change)||Math.abs(change)>0.03||!causeEventId){
        rejected.push(`unsafe_trait_delta:${trait}`);continue;
      }
      numeric[trait]=clamp(Number(numeric[trait])+change,0,1);
      accepted[trait]=change;
    }
    if(Object.keys(accepted).length){
      personality.numeric_traits=numeric;
      personality.last_deep_change_at=Date.now();
      db.prepare("UPDATE living_identity SET personality_json=?,updated_at=? WHERE person_id=?")
        .run(JSON.stringify(personality),Date.now(),row.person_id);
      recordEvolution(row.person_id,"personality_delta",accepted,causeEventId);
      applied.push("personality_delta");
    }
  }
  return{applied,rejected};
}

const normalizeState=row=>row?{
  mood:row.mood,
  energy:row.energy,
  stress:row.stress,
  socialNeed:row.social_need,
  activeNeeds:parse(row.active_needs_json,[]),
  activeInterests:parse(row.active_interests_json,[]),
  updatedAt:row.updated_at
}:null;

export function livingContext(profile){
  const row=ensureBase(profile);if(!row)return null;
  const personId=row.person_id;
  const preferences=db.prepare(`SELECT category,value,strength,evidence_count,reason,last_confirmed_at
    FROM living_preferences WHERE person_id=? ORDER BY evidence_count DESC,ABS(strength) DESC LIMIT 16`).all(personId);
  const events=db.prepare(`SELECT event_id,happened_at,category,description,emotion,intensity,importance,certainty,source
    FROM living_events WHERE person_id=? ORDER BY happened_at DESC LIMIT 10`).all(personId);
  const memories=db.prepare(`SELECT memory_id,kind,content,emotional_weight,certainty,source,created_at
    FROM living_memories WHERE person_id=? ORDER BY emotional_weight DESC,created_at DESC LIMIT 10`).all(personId);
  const evolution=db.prepare(`SELECT id,change_type,change_json,cause_event_id,created_at
    FROM living_evolution WHERE person_id=? ORDER BY id DESC LIMIT 10`).all(personId)
    .map(x=>({...x,change:parse(x.change_json,{})}));
  const current=db.prepare("SELECT * FROM living_current_state WHERE person_id=?").get(personId);
  const counts={
    events:Number(db.prepare("SELECT COUNT(*) c FROM living_events WHERE person_id=?").get(personId).c||0),
    memories:Number(db.prepare("SELECT COUNT(*) c FROM living_memories WHERE person_id=?").get(personId).c||0),
    preferences:Number(db.prepare("SELECT COUNT(*) c FROM living_preferences WHERE person_id=?").get(personId).c||0),
    evolutions:Number(db.prepare("SELECT COUNT(*) c FROM living_evolution WHERE person_id=?").get(personId).c||0)
  };
  return{
    enabled:true,
    version:1,
    identity:{
      personId,
      familyId:row.family_id||null,
      individualSeed:row.individual_seed,
      temperamentSeed:row.temperament_seed,
      origin:parse(row.origin_json,{}),
      personality:parse(row.personality_json,{}),
      past:parse(row.past_json,{})
    },
    currentState:normalizeState(current),
    preferences,
    events,
    memories,
    evolution,
    counts
  };
}

export function deleteLivingIdentity(personId){
  const id=String(personId||"").trim();if(!id)return 0;
  db.exec("BEGIN");
  try{
    db.prepare("DELETE FROM living_evolution WHERE person_id=?").run(id);
    db.prepare("DELETE FROM living_preferences WHERE person_id=?").run(id);
    db.prepare("DELETE FROM living_memories WHERE person_id=?").run(id);
    db.prepare("DELETE FROM living_events WHERE person_id=?").run(id);
    db.prepare("DELETE FROM living_current_state WHERE person_id=?").run(id);
    const result=db.prepare("DELETE FROM living_identity WHERE person_id=?").run(id);
    db.exec("COMMIT");
    return Number(result.changes||0);
  }catch(e){
    try{db.exec("ROLLBACK")}catch{}
    throw e;
  }
}
