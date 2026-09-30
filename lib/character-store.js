import { db,getPartner,savePartner,setSetting } from "./db.js";
import { deleteLivingIdentity } from "./living-identity.js";

const TABLES=[
  ["messages",["id","role","text","created_at"]],
  ["message_media",["id","message_id","kind","url","status","alt","visual_id","meta","created_at"]],
  ["pending_chats",["token","user_text","created_at"]],
  ["memories",["id","kind","content","weight","created_at"]],
  ["preferences",["owner","topic","score","confidence","reason","exposures","updated_at"]],
  ["experiences",["id","slot","topic","kind","outcome","intensity","note","created_at"]],
  ["social_contacts",["id","name","relation","closeness","energy","created_at"]],
  ["goals",["id","title","category","progress","priority","status","updated_at"]],
  ["visual_state",["id","json"]]
];

const GLOBAL_SETTINGS=new Set([
  "adultConfirmed","personSequence","activePersonId","dialogueGuardVersion",
  "dialogueContextAfter","imageCreditsBlockedUntil"
]);
const isGlobalSetting=key=>GLOBAL_SETTINGS.has(String(key))||String(key).startsWith("visualScene:");

function dumpState(){
  return{
    tables:Object.fromEntries(TABLES.map(([table])=>[table,db.prepare(`SELECT * FROM ${table}`).all()])),
    settings:db.prepare("SELECT key,value FROM settings").all().filter(row=>!isGlobalSetting(row.key))
  };
}
function clearState(){
  db.exec("PRAGMA foreign_keys=OFF; BEGIN");
  try{
    for(const [table] of [...TABLES].reverse())db.exec(`DELETE FROM ${table}`);
    const del=db.prepare("DELETE FROM settings WHERE key=?");
    for(const row of db.prepare("SELECT key FROM settings").all())if(!isGlobalSetting(row.key))del.run(row.key);
    db.exec("COMMIT; PRAGMA foreign_keys=ON");
  }catch(e){
    try{db.exec("ROLLBACK; PRAGMA foreign_keys=ON")}catch{}
    throw e;
  }
}

function restoreState(state){
  clearState();
  if(!state)return;
  db.exec("PRAGMA foreign_keys=OFF; BEGIN");
  try{
    for(const [table,cols] of TABLES){
      const rows=Array.isArray(state.tables?.[table])?state.tables[table]:[];
      if(!rows.length)continue;
      const q=db.prepare(`INSERT INTO ${table}(${cols.join(",")}) VALUES(${cols.map(()=>"?").join(",")})`);
      for(const row of rows)q.run(...cols.map(c=>row[c]??null));
    }
    const setting=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
    for(const row of Array.isArray(state.settings)?state.settings:[])if(!isGlobalSetting(row.key))setting.run(row.key,row.value);
    db.exec("COMMIT; PRAGMA foreign_keys=ON");
  }catch(e){
    try{db.exec("ROLLBACK; PRAGMA foreign_keys=ON")}catch{}
    throw e;
  }
}
export function snapshotActiveCharacter(profile=getPartner()){
  if(!profile?.personId)return null;
  savePartner(profile);
  db.prepare(`INSERT INTO character_sessions(person_id,state_json,updated_at) VALUES(?,?,?)
    ON CONFLICT(person_id) DO UPDATE SET state_json=excluded.state_json,updated_at=excluded.updated_at`)
    .run(profile.personId,JSON.stringify(dumpState()),Date.now());
  return profile.personId;
}

export function activateCharacter(personId){
  const id=String(personId||"").trim();
  const target=db.prepare("SELECT json FROM characters WHERE person_id=?").get(id);
  if(!target)return null;
  const current=getPartner();
  if(current?.personId===id)return current;
  if(current?.personId)snapshotActiveCharacter(current);
  const session=db.prepare("SELECT state_json FROM character_sessions WHERE person_id=?").get(id);
  restoreState(session?JSON.parse(session.state_json):null);
  const profile=JSON.parse(target.json);
  db.exec("DELETE FROM partner");
  savePartner(profile);
  return profile;
}
export function startNewCharacter(profile){
  const current=getPartner();
  if(current?.personId)snapshotActiveCharacter(current);
  clearState();
  db.exec("DELETE FROM partner");
  return savePartner(profile);
}

export function deleteActiveCharacter(){
  const current=getPartner();
  if(!current?.personId)return null;
  const id=current.personId;
  clearState();
  db.exec("DELETE FROM partner");
  db.prepare("DELETE FROM character_sessions WHERE person_id=?").run(id);
  db.prepare("DELETE FROM characters WHERE person_id=?").run(id);
  db.prepare("DELETE FROM character_visuals WHERE person_id=?").run(id);
  deleteLivingIdentity(id);
  db.prepare("DELETE FROM settings WHERE key=?").run(`visualScene:${id}`);
  setSetting("activePersonId",null);
  const next=db.prepare("SELECT person_id FROM characters ORDER BY created_at,person_id LIMIT 1").get();
  return next?activateCharacter(next.person_id):null;
}
