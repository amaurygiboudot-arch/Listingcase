import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),"human-partner-photo-"));
const {db}=await import("../lib/db.js");
const {lastSentVisualContext}=await import("../lib/visual.js");

test("une photo ne renseigne que son personnage et ses métadonnées",()=>{
  db.prepare("INSERT INTO visual_assets(id,place,activity,view,outfit,mood,moment) VALUES(?,?,?,?,?,?,?)")
    .run("slot1","chambre","repos","selfie","maison","joyeuse","soir");
  db.prepare("INSERT INTO character_visuals(person_id,character_seed,slot_id,file_path,mime_type,canonical,created_at) VALUES(?,?,?,?,?,?,?)")
    .run("F0001","seed-chloe","slot1","library/chloe.png","image/png",1,100);
  db.prepare("INSERT INTO messages(role,text,created_at) VALUES(?,?,?)").run("partner","Tiens, une photo",100);
  db.prepare("INSERT INTO message_media(message_id,kind,url,status,alt,visual_id,meta,created_at) VALUES(?,?,?,?,?,?,?,?)")
    .run(1,"image","/library/chloe.png","ready","Chloé","slot1",JSON.stringify({place:"chambre",activity:"repos"}),100);
  const info=lastSentVisualContext({personId:"F0001",seed:"seed-chloe"});
  assert.equal(info.place,"chambre");
  assert.equal(info.activity,"repos");
  assert.equal(info.view,"selfie");
  assert.equal(info.pose,null);
  assert.equal(lastSentVisualContext({personId:"F0002",seed:"seed-maya"}),null);
});

test.after(()=>{db.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true})});
