import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hp-source-profile-"));
process.env.DATA_DIR=dir;

const {lifeContext}=await import("../lib/routine.js");
const {runLifeTick}=await import("../lib/experiences.js");
const {createProfile}=await import("../lib/profile.js");

const sourceProfile={
  sourceProfile:"fixture",
  seed:"SOURCE_001",
  personality:{energy:"variable",sociability:"chaleureuse"},
  values:["créativité"],
  sport:"non établi",
  job:"studio de communication",
  knownSchedule:{workStart:9,workEnd:17.5}
};
const mood={energy:60,social:80,patience:60};

test("un profil source ne reçoit ni contacts, ni objectifs, ni expériences inventés",()=>{
  const life=lifeContext(sourceProfile,mood,new Date(2026,8,30,10,0,0));
  assert.equal(life.routine.sourceLocked,true);
  assert.equal(life.routine.workStart,9);
  assert.equal(life.routine.workHours,8.5);
  assert.deepEqual(life.contacts,[]);
  assert.deepEqual(life.goals,[]);
  assert.equal(life.social.planned,false);
  const tick=runLifeTick(sourceProfile,mood,new Date(2026,8,30,10,0,0));
  assert.equal(tick.reason,"source_profile_no_synthetic_experience");
  assert.equal(tick.experience,null);
});

test("un nouveau profil ne reprend pas exactement un prénom déjà utilisé",()=>{
  const used=["Lina","Camille","Nora","Maya","Élise","Jade","Ana","Sofia"];
  const p=createProfile(["femme"],used);
  assert.equal(used.includes(p.name),false);
});
