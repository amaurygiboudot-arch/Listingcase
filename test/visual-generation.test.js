import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-generation-"));
const {db,seedVisualSlots}=await import("../lib/db.js");
const {selectGenerationSlots,visualRequestContext}=await import("../lib/visual.js");
seedVisualSlots();

test("une demande explicite sans slot préindexé crée un slot cohérent",()=>{
  const profile={seed:"seed-sofia",personId:"F0001",type:"femme",origin:"Europe",stage:"affinité",visualIdentity:{hair:"attachés"}};
  const mood={mood:"joyeux"};
  const request={view:"threequarter",place:"terrasse-privee",outfit:"cosy",activity:"repos"};
  const [slot]=selectGenerationSlots(profile,mood,1,request);
  assert.equal(slot.view,request.view);
  assert.equal(slot.place,request.place);
  assert.equal(slot.outfit,request.outfit);
  assert.equal(slot.activity,request.activity);
  assert.match(slot.id,/^GEN_F0001_/);
  assert.equal(db.prepare("SELECT place FROM visual_assets WHERE id=?").get(slot.id).place,request.place);
});

test("les lieux explicites usuels sont reconnus avant la continuité automatique",()=>{
  const bureau=visualRequestContext("Montre moi une photo de toi au bureau en tenue élégante");
  assert.equal(bureau.place,"bureau");
  assert.equal(bureau.activity,"travail");
  assert.equal(bureau.outfit,"élégant");

  const douche=visualRequestContext("Montre moi une photo dans la douche");
  assert.equal(douche.place,"sdb");
  assert.equal(douche.activity,"selfcare");
});

test("les demandes de vue précises conservent focus et pose",()=>{
  const chest=visualRequestContext("As-tu une photo où je peux voir ta poitrine ?");
  assert.equal(chest.view,"halfbody");
  assert.equal(chest.focus,"upper_body");

  const rear=visualRequestContext("Je peux te voir de dos et voir tes fesses ?");
  assert.equal(rear.view,"fullbody");
  assert.equal(rear.pose,"back_view");
  assert.equal(rear.focus,"rear_body");

  const profile={seed:"seed-chloe",personId:"CHLOE_001",type:"femme",origin:"Europe",stage:"attachement",visualIdentity:{hair:"attachée"}};
  const [slot]=selectGenerationSlots(profile,{mood:"taquine"},1,rear);
  const stored=db.prepare("SELECT view,pose,focus FROM visual_assets WHERE id=?").get(slot.id);
  assert.equal(stored.view,"fullbody");
  assert.equal(stored.pose,"back_view");
  assert.equal(stored.focus,"rear_body");
});

test.after(()=>{db.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true})});