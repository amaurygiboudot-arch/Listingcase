import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-visual-owner-"));
const {db}=await import("../lib/db.js");
const {getCanonicalVisual,libraryStats,saveCharacterVisual}=await import("../lib/visual.js");

const sharedSeed="shared-seed";
const sofia={personId:"F0001",seed:sharedSeed,name:"Sofia",type:"femme",origin:"Europe",stage:"affinité"};
const lina={personId:"F0002",seed:sharedSeed,name:"Lina",type:"femme",origin:"Europe",stage:"affinité"};
const insert=db.prepare("INSERT INTO character_visuals(person_id,character_seed,slot_id,file_path,mime_type,canonical,created_at) VALUES(?,?,?,?,?,?,?)");

test("la canonique est isolée strictement par person_id même si le seed collisionne",()=>{
  insert.run(sofia.personId,sharedSeed,"SOFIA_CAN","library/sofia.png","image/png",1,1);
  insert.run(lina.personId,sharedSeed,"LINA_CAN","library/lina.png","image/png",1,2);
  assert.equal(getCanonicalVisual(sofia).file_path,"library/sofia.png");
  assert.equal(getCanonicalVisual(lina).file_path,"library/lina.png");
  assert.equal(libraryStats(sofia).available,1);
  assert.equal(libraryStats(lina).available,1);
});
test("une image non canonique ne devient jamais canonique par défaut",()=>{
  const p={personId:"F0003",seed:"seed-no-canonical",name:"Maya",type:"femme",origin:"Europe"};
  insert.run(p.personId,p.seed,"MAYA_OTHER","library/maya-other.png","image/png",0,3);
  assert.equal(getCanonicalVisual(p),null);
});

test("une sauvegarde visuelle exige toujours un person_id",()=>{
  assert.throws(
    ()=>saveCharacterVisual({seed:"seed-only",name:"SansId"},"SLOT","library/missing.png"),
    /visual_person_id_required/
  );
});

test("un slot déjà possédé par un autre person_id ne peut pas être réattribué",()=>{
  insert.run(sofia.personId,sharedSeed,"CONFLICT","library/conflict-a.png","image/png",0,4);
  assert.throws(
    ()=>saveCharacterVisual(lina,"CONFLICT","library/conflict-b.png"),
    /visual_owner_conflict/
  );
});
test("une seule canonique reste active par personnage",()=>{
  saveCharacterVisual(sofia,"CAN_1","library/can-1.png","image/png",{canonical:true});
  saveCharacterVisual(sofia,"CAN_2","library/can-2.png","image/png",{canonical:true});
  const rows=db.prepare("SELECT slot_id FROM character_visuals WHERE person_id=? AND character_seed=? AND canonical=1").all(sofia.personId,sofia.seed);
  assert.deepEqual(rows.map(x=>x.slot_id),["CAN_2"]);
  assert.equal(getCanonicalVisual(sofia).slot_id,"CAN_2");
});

test.after(()=>{
  db.close();
  fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});
});
