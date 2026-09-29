import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir=path.resolve(process.env.DATA_DIR||"data");
fs.mkdirSync(dataDir,{recursive:true});
export const db=new DatabaseSync(path.join(dataDir,"human-partner.sqlite"));
try{db.exec("PRAGMA journal_mode=WAL;")}catch(e){console.warn("SQLite WAL déjà actif ou temporairement indisponible:",e.message)}
db.exec(`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS partner(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,role TEXT NOT NULL,text TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS message_media(id INTEGER PRIMARY KEY AUTOINCREMENT,message_id INTEGER NOT NULL,kind TEXT NOT NULL,url TEXT,status TEXT NOT NULL DEFAULT 'ready',alt TEXT,visual_id TEXT,meta TEXT,created_at INTEGER NOT NULL,FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS pending_chats(token TEXT PRIMARY KEY,user_text TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS memories(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,content TEXT NOT NULL,weight INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS preferences(owner TEXT NOT NULL,topic TEXT NOT NULL,score INTEGER NOT NULL DEFAULT 0,confidence REAL NOT NULL DEFAULT 0.1,reason TEXT,exposures INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,PRIMARY KEY(owner,topic));
CREATE TABLE IF NOT EXISTS experiences(id INTEGER PRIMARY KEY AUTOINCREMENT,slot TEXT NOT NULL UNIQUE,topic TEXT NOT NULL,kind TEXT NOT NULL,outcome TEXT NOT NULL,intensity INTEGER NOT NULL,note TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS social_contacts(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,relation TEXT NOT NULL,closeness INTEGER NOT NULL,energy TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS goals(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL UNIQUE,category TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,priority INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'active',updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS visual_assets(id TEXT PRIMARY KEY,type TEXT,origin TEXT,mood TEXT,place TEXT,moment TEXT,weather TEXT,outfit TEXT,hair TEXT,activity TEXT,relationship TEXT,view TEXT,file_path TEXT,available INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS character_visuals(id INTEGER PRIMARY KEY AUTOINCREMENT,person_id TEXT,character_seed TEXT NOT NULL,slot_id TEXT NOT NULL,file_path TEXT NOT NULL,mime_type TEXT NOT NULL DEFAULT 'image/png',canonical INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,UNIQUE(character_seed,slot_id));
CREATE INDEX IF NOT EXISTS idx_character_visuals_seed ON character_visuals(character_seed);
CREATE TABLE IF NOT EXISTS visual_state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS world_people(person_id TEXT PRIMARY KEY,name TEXT NOT NULL,temperament TEXT NOT NULL DEFAULT 'calme');
CREATE TABLE IF NOT EXISTS world_relations(owner_id TEXT NOT NULL,other_id TEXT NOT NULL,kind TEXT NOT NULL,trust INTEGER NOT NULL DEFAULT 50,closeness INTEGER NOT NULL DEFAULT 50,PRIMARY KEY(owner_id,other_id),FOREIGN KEY(owner_id) REFERENCES world_people(person_id),FOREIGN KEY(other_id) REFERENCES world_people(person_id));
CREATE TABLE IF NOT EXISTS world_facts(fact_id TEXT PRIMARY KEY,subject_id TEXT NOT NULL,predicate TEXT NOT NULL,detail TEXT NOT NULL,happened_at INTEGER NOT NULL,sensitivity INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS world_knowledge(owner_id TEXT NOT NULL,fact_id TEXT NOT NULL,source_id TEXT NOT NULL,channel TEXT NOT NULL,confidence REAL NOT NULL,learned_at INTEGER NOT NULL,secret INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(owner_id,fact_id),FOREIGN KEY(owner_id) REFERENCES world_people(person_id),FOREIGN KEY(fact_id) REFERENCES world_facts(fact_id));
CREATE TABLE IF NOT EXISTS world_transmissions(id INTEGER PRIMARY KEY AUTOINCREMENT,fact_id TEXT NOT NULL,speaker_id TEXT NOT NULL,listener_id TEXT NOT NULL,said_at INTEGER NOT NULL,confidence REAL NOT NULL,FOREIGN KEY(fact_id) REFERENCES world_facts(fact_id));
CREATE INDEX IF NOT EXISTS idx_world_knowledge_owner ON world_knowledge(owner_id,learned_at);
`);
const visualColumns=new Set(db.prepare("PRAGMA table_info(visual_assets)").all().map(x=>x.name));
if(!visualColumns.has("view"))db.exec("ALTER TABLE visual_assets ADD COLUMN view TEXT");
const missingViews=db.prepare("SELECT id,rowid FROM visual_assets WHERE view IS NULL OR view=''").all();
if(missingViews.length){
  const views=["portrait","halfbody","threequarter","fullbody","miroir","selfie"];
  const updateView=db.prepare("UPDATE visual_assets SET view=? WHERE id=?");
  db.exec("BEGIN");
  for(const row of missingViews)updateView.run(views[(Number(row.rowid)-1)%views.length],row.id);
  db.exec("COMMIT");
}
const characterVisualColumns=new Set(db.prepare("PRAGMA table_info(character_visuals)").all().map(x=>x.name));
if(!characterVisualColumns.has("person_id"))db.exec("ALTER TABLE character_visuals ADD COLUMN person_id TEXT");
db.exec("CREATE INDEX IF NOT EXISTS idx_character_visuals_person ON character_visuals(person_id,slot_id)");
try{
  const legacy=db.prepare("SELECT json FROM partner WHERE id=1").get();
  if(legacy){
    const p=JSON.parse(legacy.json);
    if(p?.personId&&p?.seed)db.prepare("UPDATE character_visuals SET person_id=? WHERE character_seed=? AND (person_id IS NULL OR person_id='')").run(p.personId,p.seed);
  }
}catch{}

export const getSetting=(k,d=null)=>{const r=db.prepare("SELECT value FROM settings WHERE key=?").get(k);return r?JSON.parse(r.value):d};
export const setSetting=(k,v)=>db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(k,JSON.stringify(v));
export const ensurePersonId=p=>{
  if(!p||p.personId)return p;
  const seq=Number(getSetting("personSequence",0)||0)+1;
  setSetting("personSequence",seq);
  const prefix=p.type==="femme"?"F":p.type==="homme"?"H":p.type==="non-binaire"?"NB":"AG";
  p.personId=`${prefix}${String(seq).padStart(4,"0")}`;
  return p;
};
export const getPartner=()=>{const r=db.prepare("SELECT json FROM partner WHERE id=1").get();return r?JSON.parse(r.json):null};
export const savePartner=p=>db.prepare("INSERT INTO partner(id,json,created_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(JSON.stringify(p),Date.now());
export const clearPartner=()=>db.exec("DELETE FROM partner; DELETE FROM message_media; DELETE FROM pending_chats; DELETE FROM messages; DELETE FROM memories; DELETE FROM preferences; DELETE FROM experiences; DELETE FROM social_contacts; DELETE FROM goals; DELETE FROM character_visuals; DELETE FROM visual_state; DELETE FROM world_transmissions; DELETE FROM world_knowledge; DELETE FROM world_facts; DELETE FROM world_relations; DELETE FROM world_people; DELETE FROM settings WHERE key IN ('routineProfile','pendingExperienceStory','lastLifeTickAt','lastInitiativeAt','emotionalState','lastInteractionAt') OR key LIKE 'visualScene:%';");
export const addMessage=(role,text)=>{
  const r=db.prepare("INSERT INTO messages(role,text,created_at) VALUES(?,?,?)").run(role,text,Date.now());
  return Number(r.lastInsertRowid);
};
export const addMessageMedia=(messageId,{kind="image",url=null,status="ready",alt="",visualId=null,meta=null}={})=>{
  const r=db.prepare("INSERT INTO message_media(message_id,kind,url,status,alt,visual_id,meta,created_at) VALUES(?,?,?,?,?,?,?,?)")
    .run(messageId,kind,url,status,alt,visualId,meta?JSON.stringify(meta):null,Date.now());
  return Number(r.lastInsertRowid);
};
export const getMessageMedia=id=>db.prepare("SELECT * FROM message_media WHERE id=?").get(id)||null;
export const updateMessageMedia=(id,{url,status,alt,visualId,meta}={})=>{
  const current=getMessageMedia(id);if(!current)return null;
  const next={
    url:url===undefined?current.url:url,
    status:status===undefined?current.status:status,
    alt:alt===undefined?current.alt:alt,
    visualId:visualId===undefined?current.visual_id:visualId,
    meta:meta===undefined?current.meta:(meta?JSON.stringify(meta):null)
  };
  db.prepare("UPDATE message_media SET url=?,status=?,alt=?,visual_id=?,meta=? WHERE id=?")
    .run(next.url,next.status,next.alt,next.visualId,next.meta,id);
  return getMessageMedia(id);
};
export const recentMessages=(limit=30)=>{
  const rows=db.prepare("SELECT id,role,text,created_at FROM messages ORDER BY id DESC LIMIT ?").all(limit).reverse();
  const q=db.prepare("SELECT id,kind,url,status,alt,visual_id,meta,created_at FROM message_media WHERE message_id=? ORDER BY id");
  return rows.map(m=>({...m,media:q.all(m.id).map(x=>({...x,meta:x.meta?JSON.parse(x.meta):null}))}));
};
export const createPendingChat=(token,userText)=>db.prepare("INSERT INTO pending_chats(token,user_text,created_at) VALUES(?,?,?)").run(token,userText,Date.now());
export const getPendingChat=token=>db.prepare("SELECT token,user_text,created_at FROM pending_chats WHERE token=?").get(token)||null;
export const deletePendingChat=token=>db.prepare("DELETE FROM pending_chats WHERE token=?").run(token);
export const addMemory=(kind,content,weight=1)=>db.prepare("INSERT INTO memories(kind,content,weight,created_at) VALUES(?,?,?,?)").run(kind,content,weight,Date.now());
export const recentMemories=(limit=20)=>db.prepare("SELECT kind,content,weight,created_at FROM memories ORDER BY weight DESC, id DESC LIMIT ?").all(limit);
export const getVisualState=()=>{const r=db.prepare("SELECT json FROM visual_state WHERE id=1").get();return r?JSON.parse(r.json):{}};
export const saveVisualState=s=>db.prepare("INSERT INTO visual_state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(JSON.stringify(s));

export function seedVisualSlots(){
  const n=db.prepare("SELECT COUNT(*) c FROM visual_assets").get().c;if(n>=10000)return n;
  const types=["femme","homme","non-binaire","androgyne / fluide"],origins=["Europe","Asie de l'Est","Monde arabe / Afrique du Nord","Afrique subsaharienne","Amérique du Nord","Amérique latine","Asie du Sud","métissé·e"];
  const moods=["calme","joyeux","fatigué","taquin","curieux","fier","triste","vexé","frustré","apaisé"],places=["salon","chambre","cuisine","bureau","café","parc","plage","voiture","hôtel","salle de sport"],moments=["matin","midi","après-midi","soir","nuit"],weather=["intérieur","soleil","nuageux","pluie","froid","chaleur"],outfits=["cosy","casual","élégant","sport","travail","maison","sortie"],hair=["naturelle","attachée","détachée","soignée","décoiffée"],activities=["repos","discussion","café","repas","lecture","musique","travail","marche","sport","voyage"],rels=["premier contact","connaissance","affinité","attachement"],views=["portrait","halfbody","threequarter","fullbody","miroir","selfie"];
  const q=db.prepare("INSERT OR IGNORE INTO visual_assets(id,type,origin,mood,place,moment,weather,outfit,hair,activity,relationship,view,file_path,available) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0)");
  db.exec("BEGIN");
  for(let t=0;t<4;t++)for(let i=0;i<2500;i++){const code=["F","H","NB","AG"][t],id=`IMG_${code}_${String(i+1).padStart(4,"0")}`;q.run(id,types[t],origins[(i*5+1)%origins.length],moods[(i*7+3)%moods.length],places[(i*11+5)%places.length],moments[(i*3+1)%moments.length],weather[(i*5+2)%weather.length],outfits[(i*9+4)%outfits.length],hair[(i*13+2)%hair.length],activities[(i*17+6)%activities.length],rels[(i*19+1)%rels.length],views[i%views.length],`library/${id}.webp`)}
  db.exec("COMMIT");return 10000;
}
