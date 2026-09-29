import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-generation-"));
const {db,seedVisualSlots}=await import("../lib/db.js");
const {selectGenerationSlots}=await import("../lib/visual.js");
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

test.after(()=>{db.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true})});