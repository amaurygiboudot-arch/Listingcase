import { db,getVisualState,saveVisualState } from "./db.js";

const score=(r,q,s)=>{
  let n=0;
  if(r.type===q.type)n+=50;
  if(r.origin===q.origin)n+=8;
  if(r.relationship===q.relationship)n+=8;
  if(r.mood===q.mood)n+=10;
  if(s.place&&r.place===s.place)n+=12;
  if(s.outfit&&r.outfit===s.outfit)n+=10;
  if(s.hair&&r.hair===s.hair)n+=8;
  if(s.moment&&r.moment===s.moment)n+=6;
  if(s.weather&&r.weather===s.weather)n+=5;
  return n;
};

function rankedSlots(profile,mood,limit=700){
  const s=getVisualState();
  const rows=db.prepare("SELECT * FROM visual_assets WHERE type=? LIMIT ?").all(profile.type,limit);
  const q={type:profile.type,origin:profile.origin,relationship:profile.stage,mood:mood.mood};
  return rows.map(r=>({...r,score:score(r,q,s)})).sort((a,b)=>b.score-a.score);
}

export function selectAvailableVisuals(profile,mood,count=4){
  const slots=rankedSlots(profile,mood);
  const getFile=db.prepare("SELECT file_path,mime_type,canonical FROM character_visuals WHERE character_seed=? AND slot_id=?");
  const ready=[];
  for(const slot of slots){
    const file=getFile.get(profile.seed,slot.id);
    if(!file)continue;
    ready.push({
      ...slot,
      file_path:file.file_path,
      mime_type:file.mime_type,
      canonical:Boolean(file.canonical),
      url:"/"+String(file.file_path).replace(/^\/+/, ""),
      needsGeneration:false
    });
    if(ready.length>=count)break;
  }
  return ready;
}

export function selectGenerationSlots(profile,mood,count=1){
  const slots=rankedSlots(profile,mood);
  const exists=db.prepare("SELECT 1 ok FROM character_visuals WHERE character_seed=? AND slot_id=?");
  return slots.filter(s=>!exists.get(profile.seed,s.id)).slice(0,count).map(s=>({...s,needsGeneration:true}));
}

export function selectVisuals(profile,mood,count=4){
  const ready=selectAvailableVisuals(profile,mood,count);
  if(ready.length>=count)return ready;
  return [...ready,...selectGenerationSlots(profile,mood,count-ready.length)];
}

export function saveCharacterVisual(profile,slotId,filePath,mimeType="image/png",{canonical=false}={}){
  db.prepare(`
    INSERT INTO character_visuals(character_seed,slot_id,file_path,mime_type,canonical,created_at)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(character_seed,slot_id) DO UPDATE SET
      file_path=excluded.file_path,
      mime_type=excluded.mime_type,
      canonical=MAX(character_visuals.canonical,excluded.canonical)
  `).run(profile.seed,slotId,filePath,mimeType,canonical?1:0,Date.now());
  return db.prepare("SELECT * FROM character_visuals WHERE character_seed=? AND slot_id=?").get(profile.seed,slotId);
}

export function updateVisualState(patch){
  const next={...getVisualState(),...patch,updatedAt:Date.now()};
  saveVisualState(next);
  return next;
}

export function libraryStats(profile=null){
  const total=Number(db.prepare("SELECT COUNT(*) c FROM visual_assets").get().c||0);
  if(!profile)return{total,available:Number(db.prepare("SELECT COUNT(*) c FROM character_visuals").get().c||0)};
  const available=Number(db.prepare("SELECT COUNT(*) c FROM character_visuals WHERE character_seed=?").get(profile.seed).c||0);
  return{total,available};
}
