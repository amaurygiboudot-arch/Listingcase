import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-social-"));
const { db }=await import("../lib/db.js");
const { ensureWorldPerson,relatePeople,witnessEvent,confideFact,rememberFacts,keepSecret,tellFact,socialContext }=await import("../lib/social-world.js");

test("les personnages ne partagent pas leurs confidences par simple relation",()=>{
  for(const name of ["chloe","liam","maya","ines"] )ensureWorldPerson(name,name);
  relatePeople("chloe","liam","amis",{trust:80,closeness:90});
  const confidence=confideFact("chloe",{subjectId:"user",predicate:"travail",detail:"Inquiet pour son travail",happenedAt:100});
  assert.equal(rememberFacts("chloe").length,1);
  assert.equal(rememberFacts("liam").length,0);
  assert.throws(()=>tellFact("chloe","liam",confidence),/secret_kept/);
  assert.equal(rememberFacts("liam").length,0);
});

test("témoins, rumeur, secret et personne ignorante",()=>{
  const event=witnessEvent({subjectId:"user",predicate:"dispute",detail:"A insulté Maya",witnesses:["maya","liam"],happenedAt:200});
  assert.equal(rememberFacts("chloe").some(f=>f.fact_id===event),false);
  const rumor=tellFact("liam","chloe",event,{saidAt:300});
  assert.equal(rumor.source_id,"liam");
  assert.equal(rumor.confidence,0.8);
  assert.equal(socialContext("chloe").find(f=>f.detail==="A insulté Maya").certainty,"rapporté");
  keepSecret("chloe",event);
  assert.throws(()=>tellFact("chloe","ines",event),/secret_kept/);
  assert.equal(rememberFacts("ines").length,0);
  assert.equal(tellFact("chloe","ines",event,{overrideSecret:true}).confidence,0.64);
  assert.throws(()=>tellFact("ines","nora",event),/unknown_or_identical_person/);
});

test("un personnage ne peut transmettre un fait qu'il ignore",()=>{
  const event=witnessEvent({subjectId:"user",predicate:"promesse",detail:"A promis de revenir",witnesses:["maya"]});
  assert.throws(()=>tellFact("ines","liam",event),/fact_not_known/);
});

test.after(()=>{db.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true})});
