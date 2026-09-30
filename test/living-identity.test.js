import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hp-living-identity-"));
process.env.DATA_DIR=dir;

const {
  ensureLivingIdentity,
  updateLivingCurrentState,
  recordLivingEvent,
  recordClassifiedLivingEvent,
  syncLivingPreference,
  applyLivingDelta,
  livingContext
}=await import("../lib/living-identity.js");

const chloe={
  personId:"CHLOE_001",
  seed:"CHLOE_001_seed_main",
  name:"Chloé",
  origin:"non établie",
  sourceProfile:"Chloe_Personnalite_et_Photos",
  personality:{playfulness:"taquine",affection:"tendre"},
  familyId:null
};
const other={...chloe,personId:"F_TEST_002",seed:"OTHER_SEED",name:"Autre"};
test("les seeds vivants restent stables et propres à chaque personnage",()=>{
  const a1=ensureLivingIdentity(chloe);
  const a2=ensureLivingIdentity(chloe);
  const b=ensureLivingIdentity(other);
  assert.equal(a1.individualSeed,a2.individualSeed);
  assert.equal(a1.temperamentSeed,a2.temperamentSeed);
  assert.notEqual(a1.individualSeed,b.individualSeed);
  assert.notEqual(a1.temperamentSeed,b.temperamentSeed);
});

test("événements, souvenirs et état courant sont isolés par person_id",()=>{
  updateLivingCurrentState(chloe,{mood:{mood:"curieuse",energy:72,social:48}});
  updateLivingCurrentState(other,{mood:{mood:"calme",energy:30,social:20}});
  recordLivingEvent(chloe,{category:"important",description:"Souvenir propre à Chloé",importance:.8});
  recordLivingEvent(other,{category:"important",description:"Souvenir propre à l'autre",importance:.8});
  const a=livingContext(chloe),b=livingContext(other);
  assert.equal(a.currentState.mood,"curieuse");
  assert.equal(b.currentState.mood,"calme");
  assert.equal(a.events.some(e=>e.description.includes("autre")),false);
  assert.equal(b.events.some(e=>e.description.includes("Chloé")),false);
  assert.equal(a.memories.length,1);
  assert.equal(b.memories.length,1);
});
test("les préférences se renforcent par preuves au lieu de devenir absolues d'un coup",()=>{
  syncLivingPreference(chloe,{topic:"cuisine",score:16,exposures:1,reason:"premier essai"},"J'aime bien cuisiner");
  let ctx=livingContext(chloe);
  let pref=ctx.preferences.find(p=>p.value==="cuisine");
  assert.equal(pref.evidence_count,1);
  assert.ok(pref.strength>0&&pref.strength<.5);

  syncLivingPreference(chloe,{topic:"cuisine",score:30,exposures:2,reason:"confirmation"},"J'aime vraiment cuisiner");
  ctx=livingContext(chloe);
  pref=ctx.preferences.find(p=>p.value==="cuisine");
  assert.equal(pref.evidence_count,2);
  assert.ok(pref.strength>=.3&&pref.strength<1);
});

test("un événement classé important crée une mémoire durable",()=>{
  const before=livingContext(chloe).counts.memories;
  recordClassifiedLivingEvent(chloe,"Promis, je m'en souviendrai.",{kind:"important",weight:4,valence:0});
  const after=livingContext(chloe);
  assert.equal(after.counts.memories,before+1);
  assert.equal(after.events[0].category,"important");
});

test("un delta ne peut pas réécrire un trait profond inconnu",()=>{
  const before=ensureLivingIdentity(chloe);
  const result=applyLivingDelta(chloe,{personality_delta:{empathy:.9}},"EVT_FAKE");
  const after=ensureLivingIdentity(chloe);
  assert.deepEqual(result.applied,[]);
  assert.ok(result.rejected.includes("unknown_trait:empathy"));
  assert.equal(after.individualSeed,before.individualSeed);
  assert.equal(after.temperamentSeed,before.temperamentSeed);
});
