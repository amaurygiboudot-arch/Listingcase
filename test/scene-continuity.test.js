import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-scene-"));
const { db }=await import("../lib/db.js");
const { minimumTravelMinutes,resolveVisualScene,noteVisualScene }=await import("../lib/scene-continuity.js");
const chloe={personId:"F001"},maya={personId:"F002"};
const start=1_000_000;

test("chambre puis plage cinq minutes après est refusé",()=>{
  noteVisualScene(chloe,"chambre",start);
  const next=resolveVisualScene(chloe,{place:"plage"},start+5*60_000);
  assert.equal(next.allowed,false);
  assert.match(next.reason,/encore dans la chambre/);
  assert.equal(resolveVisualScene(chloe,{place:"plage"},start+31*60_000).allowed,true);
});

test("sans lieu demandé, une photo récente reste dans le même lieu",()=>{
  assert.equal(resolveVisualScene(chloe,{view:"selfie"},start+6*60_000).request.place,"chambre");
  assert.equal(resolveVisualScene(chloe,{place:"salon"},start+6*60_000).allowed,true);
  assert.equal(resolveVisualScene(chloe,{},start+21*60_000).request.place,undefined);
  assert.equal(minimumTravelMinutes("salon","chambre"),2);
});

test("la continuité est propre à chaque personnage",()=>{
  assert.equal(resolveVisualScene(maya,{place:"plage"},start+5*60_000).allowed,true);
});

test.after(()=>{db.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true})});
