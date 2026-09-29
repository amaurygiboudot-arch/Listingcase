import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-characters-"));
const dbmod=await import("../lib/db.js");
const store=await import("../lib/character-store.js");
const {db,savePartner,getPartner,addMessage,recentMessages,addMemory,recentMemories,setSetting,getSetting,listPartners}=dbmod;

const chloe={personId:"F0001",seed:"seed-chloe",name:"Chloé",type:"femme",origin:"Europe",stage:"affinité",createdAt:1};
const maya={personId:"F0002",seed:"seed-maya",name:"Maya",type:"femme",origin:"Europe",stage:"premier contact",createdAt:2};

test("chaque personnage récupère sa conversation, sa mémoire et son état",()=>{
  savePartner(chloe);
  addMessage("user","message-chloe");
  addMemory("important","memoire-chloe",4);
  setSetting("emotionalState",{warmth:31,irritation:0,hurt:0});

  store.startNewCharacter(maya);
  assert.equal(getPartner().personId,maya.personId);
  assert.equal(recentMessages(10).length,0);
  assert.equal(recentMemories(10).length,0);
  assert.equal(getSetting("emotionalState",null),null);

  addMessage("user","message-maya");
  addMemory("important","memoire-maya",4);
  setSetting("emotionalState",{warmth:3,irritation:7,hurt:2});

  store.activateCharacter(chloe.personId);
  assert.equal(getPartner().name,"Chloé");
  assert.deepEqual(recentMessages(10).map(x=>x.text),["message-chloe"]);
  assert.deepEqual(recentMemories(10).map(x=>x.content),["memoire-chloe"]);
  assert.equal(getSetting("emotionalState").warmth,31);

  store.activateCharacter(maya.personId);
  assert.equal(getPartner().name,"Maya");
  assert.deepEqual(recentMessages(10).map(x=>x.text),["message-maya"]);
  assert.deepEqual(recentMemories(10).map(x=>x.content),["memoire-maya"]);
  assert.equal(getSetting("emotionalState").irritation,7);

  const people=listPartners();
  assert.deepEqual(people.map(x=>x.personId),[chloe.personId,maya.personId]);
  assert.equal(people.find(x=>x.personId===maya.personId).active,true);
});

test("supprimer l'actif conserve l'autre personnage",()=>{
  store.deleteActiveCharacter();
  assert.equal(getPartner().personId,chloe.personId);
  assert.equal(listPartners().length,1);
  assert.deepEqual(recentMessages(10).map(x=>x.text),["message-chloe"]);
});
test.after(()=>{
  db.close();
  fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});
});
