import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir=path.resolve("data");
fs.mkdirSync(dataDir,{recursive:true});
export const db=new DatabaseSync(path.join(dataDir,"human-partner.sqlite"));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS partner(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,role TEXT NOT NULL,text TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS memories(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,content TEXT NOT NULL,weight INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS preferences(owner TEXT NOT NULL,topic TEXT NOT NULL,score INTEGER NOT NULL DEFAULT 0,confidence REAL NOT NULL DEFAULT 0.1,reason TEXT,exposures INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,PRIMARY KEY(owner,topic));
CREATE TABLE IF NOT EXISTS experiences(id INTEGER PRIMARY KEY AUTOINCREMENT,slot TEXT NOT NULL UNIQUE,topic TEXT NOT NULL,kind TEXT NOT NULL,outcome TEXT NOT NULL,intensity INTEGER NOT NULL,note TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS social_contacts(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,relation TEXT NOT NULL,closeness INTEGER NOT NULL,energy TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS goals(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL UNIQUE,category TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,priority INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'active',updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS visual_assets(id TEXT PRIMARY KEY,type TEXT,origin TEXT,mood TEXT,place TEXT,moment TEXT,weather TEXT,outfit TEXT,hair TEXT,activity TEXT,relationship TEXT,file_path TEXT,available INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS visual_state(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL);
`);

export const getSetting=(k,d=null)=>{const r=db.prepare("SELECT value FROM settings WHERE key=?").get(k);return r?JSON.parse(r.value):d};
export const setSetting=(k,v)=>db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(k,JSON.stringify(v));
export const getPartner=()=>{const r=db.prepare("SELECT json FROM partner WHERE id=1").get();return r?JSON.parse(r.json):null};
export const savePartner=p=>db.prepare("INSERT INTO partner(id,json,created_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(JSON.stringify(p),Date.now());
export const clearPartner=()=>db.exec("DELETE FROM partner; DELETE FROM messages; DELETE FROM memories; DELETE FROM preferences; DELETE FROM experiences; DELETE FROM social_contacts; DELETE FROM goals; DELETE FROM visual_state; DELETE FROM settings WHERE key IN ('routineProfile','pendingExperienceStory','lastLifeTickAt','lastInitiativeAt','emotionalState','lastInteractionAt');");
export const addMessage=(role,text)=>db.prepare("INSERT INTO messages(role,text,created_at) VALUES(?,?,?)").run(role,text,Date.now());
export const recentMessages=(limit=30)=>db.prepare("SELECT role,text,created_at FROM messages ORDER BY id DESC LIMIT ?").all(limit).reverse();
export const addMemory=(kind,content,weight=1)=>db.prepare("INSERT INTO memories(kind,content,weight,created_at) VALUES(?,?,?,?)").run(kind,content,weight,Date.now());
export const recentMemories=(limit=20)=>db.prepare("SELECT kind,content,weight,created_at FROM memories ORDER BY weight DESC, id DESC LIMIT ?").all(limit);
export const getVisualState=()=>{const r=db.prepare("SELECT json FROM visual_state WHERE id=1").get();return r?JSON.parse(r.json):{}};
export const saveVisualState=s=>db.prepare("INSERT INTO visual_state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json").run(JSON.stringify(s));

export function seedVisualSlots(){
  const n=db.prepare("SELECT COUNT(*) c FROM visual_assets").get().c;if(n>=10000)return n;
  const types=["femme","homme","non-binaire","androgyne / fluide"],origins=["Europe","Asie de l'Est","Monde arabe / Afrique du Nord","Afrique subsaharienne","Amérique du Nord","Amérique latine","Asie du Sud","métissé·e"];
  const moods=["calme","joyeux","fatigué","taquin","curieux","fier","triste","vexé","frustré","apaisé"],places=["salon","chambre","cuisine","bureau","café","parc","plage","voiture","hôtel","salle de sport"],moments=["matin","midi","après-midi","soir","nuit"],weather=["intérieur","soleil","nuageux","pluie","froid","chaleur"],outfits=["cosy","casual","élégant","sport","travail","maison","sortie"],hair=["naturelle","attachée","détachée","soignée","décoiffée"],activities=["repos","discussion","café","repas","lecture","musique","travail","marche","sport","voyage"],rels=["premier contact","connaissance","affinité","attachement"];
  const q=db.prepare("INSERT OR IGNORE INTO visual_assets(id,type,origin,mood,place,moment,weather,outfit,hair,activity,relationship,file_path,available) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)");
  db.exec("BEGIN");
  for(let t=0;t<4;t++)for(let i=0;i<2500;i++){const code=["F","H","NB","AG"][t],id=`IMG_${code}_${String(i+1).padStart(4,"0")}`;q.run(id,types[t],origins[(i*5+1)%origins.length],moods[(i*7+3)%moods.length],places[(i*11+5)%places.length],moments[(i*3+1)%moments.length],weather[(i*5+2)%weather.length],outfits[(i*9+4)%outfits.length],hair[(i*13+2)%hair.length],activities[(i*17+6)%activities.length],rels[(i*19+1)%rels.length],`library/${id}.webp`)}
  db.exec("COMMIT");return 10000;
}
