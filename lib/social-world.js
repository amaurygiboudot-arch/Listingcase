import crypto from "node:crypto";
import { db } from "./db.js";

const id=v=>{const s=String(v||"").trim();if(!/^[A-Za-z0-9_-]{1,64}$/.test(s))throw new Error("invalid_person_id");return s};
const bounded=(v,min,max)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error("invalid_number");return n};
const known=(owner,fact)=>db.prepare(`SELECT f.*,k.source_id,k.channel,k.confidence,k.learned_at,k.secret FROM world_knowledge k
  JOIN world_facts f ON f.fact_id=k.fact_id WHERE k.owner_id=? AND f.fact_id=?`).get(id(owner),String(fact))||null;
const person=personId=>db.prepare("SELECT * FROM world_people WHERE person_id=?").get(id(personId))||null;

export function ensureWorldPerson(personId,name,temperament="calme"){
  personId=id(personId);name=String(name||"").trim().slice(0,100);
  if(!name)throw new Error("invalid_person_name");
  db.prepare("INSERT INTO world_people(person_id,name,temperament) VALUES(?,?,?) ON CONFLICT(person_id) DO UPDATE SET name=excluded.name")
    .run(personId,name,String(temperament).slice(0,80));
  return person(personId);
}
export const listWorldPeople=()=>db.prepare("SELECT * FROM world_people ORDER BY name").all();
export function relatePeople(owner,other,kind,{trust=50,closeness=50}={}){
  if(id(owner)===id(other)||!person(owner)||!person(other))throw new Error("unknown_or_identical_person");
  db.prepare(`INSERT INTO world_relations VALUES(?,?,?,?,?) ON CONFLICT(owner_id,other_id)
    DO UPDATE SET kind=excluded.kind,trust=excluded.trust,closeness=excluded.closeness`)
    .run(owner,other,String(kind||"connaissance").slice(0,80),bounded(trust,0,100),bounded(closeness,0,100));
}
export function witnessEvent({subjectId,predicate,detail,witnesses=[],sensitivity=0,happenedAt=Date.now()}){
  subjectId=id(subjectId);predicate=String(predicate||"").trim().slice(0,80);
  detail=String(detail||"").trim().slice(0,500);
  if(!predicate||!detail||!Array.isArray(witnesses)||witnesses.length>100)throw new Error("invalid_event");
  const ids=[...new Set(witnesses.map(id))];
  if(ids.some(x=>!person(x)))throw new Error("unknown_witness");
  const factId=crypto.randomUUID(),when=bounded(happenedAt,0,Number.MAX_SAFE_INTEGER);
  db.exec("BEGIN");
  try{
    db.prepare("INSERT INTO world_facts VALUES(?,?,?,?,?,?)").run(factId,subjectId,predicate,detail,when,bounded(sensitivity,0,3));
    const insert=db.prepare("INSERT INTO world_knowledge VALUES(?,?,?,?,?,?,?)");
    for(const witness of ids)insert.run(witness,factId,"direct","witness",1,when,0);
    db.exec("COMMIT");
  }catch(e){db.exec("ROLLBACK");throw e}
  return factId;
}
export function confideFact(owner,{subjectId,predicate,detail,sensitivity=2,happenedAt=Date.now()}){
  if(!person(owner))throw new Error("unknown_person");
  const factId=witnessEvent({subjectId,predicate,detail,witnesses:[],sensitivity,happenedAt});
  db.prepare("INSERT INTO world_knowledge VALUES(?,?,?,?,?,?,?)").run(id(owner),factId,"user","confided",1,happenedAt,1);
  return factId;
}
export function rememberFacts(owner,{subjectId=null,limit=20}={}){
  if(!person(owner))throw new Error("unknown_person");
  const filter=subjectId?" AND f.subject_id=?":"";
  const args=subjectId?[id(owner),id(subjectId),bounded(limit,1,100)]:[id(owner),bounded(limit,1,100)];
  return db.prepare(`SELECT f.*,k.source_id,k.channel,k.confidence,k.learned_at,k.secret
    FROM world_knowledge k JOIN world_facts f ON f.fact_id=k.fact_id
    WHERE k.owner_id=?${filter} ORDER BY k.learned_at DESC LIMIT ?`).all(...args);
}
export function keepSecret(owner,factId,secret=true){
  const r=db.prepare("UPDATE world_knowledge SET secret=? WHERE owner_id=? AND fact_id=?")
    .run(secret?1:0,id(owner),String(factId));
  if(!r.changes)throw new Error("fact_not_known");
}
export function tellFact(speaker,listener,factId,{overrideSecret=false,saidAt=Date.now()}={}){
  if(id(speaker)===id(listener)||!person(listener))throw new Error("unknown_or_identical_person");
  const current=known(speaker,factId);
  if(!current)throw new Error("fact_not_known");
  if(current.secret&&!overrideSecret)throw new Error("secret_kept");
  const confidence=Math.round(current.confidence*800)/1000,when=bounded(saidAt,0,Number.MAX_SAFE_INTEGER);
  db.exec("BEGIN");
  try{
    db.prepare("INSERT INTO world_transmissions(fact_id,speaker_id,listener_id,said_at,confidence) VALUES(?,?,?,?,?)")
      .run(factId,speaker,listener,when,confidence);
    db.prepare(`INSERT INTO world_knowledge VALUES(?,?,?,?,?,?,0) ON CONFLICT(owner_id,fact_id) DO UPDATE SET
      confidence=max(world_knowledge.confidence,excluded.confidence),
      source_id=CASE WHEN excluded.confidence>world_knowledge.confidence THEN excluded.source_id ELSE world_knowledge.source_id END,
      channel=CASE WHEN excluded.confidence>world_knowledge.confidence THEN excluded.channel ELSE world_knowledge.channel END,
      learned_at=CASE WHEN excluded.confidence>world_knowledge.confidence THEN excluded.learned_at ELSE world_knowledge.learned_at END`)
      .run(listener,factId,speaker,"told",confidence,when);
    db.exec("COMMIT");
  }catch(e){db.exec("ROLLBACK");throw e}
  return known(listener,factId);
}
export function socialContext(owner,{limit=5}={}){
  if(!person(owner))return[];
  return rememberFacts(owner,{limit}).map(f=>({
    detail:f.detail,subject:f.subject_id,source:f.source_id,channel:f.channel,
    certainty:f.confidence>=0.9&&f.channel==="witness"?"observé":f.confidence>=0.7?"rapporté":"incertain",
    secret:Boolean(f.secret),happenedAt:f.happened_at
  }));
}
