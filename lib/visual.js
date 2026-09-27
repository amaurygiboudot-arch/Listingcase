import { db,getVisualState,saveVisualState } from "./db.js";

const score=(r,q,s)=>{let n=0;if(r.type===q.type)n+=50;if(r.origin===q.origin)n+=8;if(r.relationship===q.relationship)n+=8;if(r.mood===q.mood)n+=10;if(s.place&&r.place===s.place)n+=12;if(s.outfit&&r.outfit===s.outfit)n+=10;if(s.hair&&r.hair===s.hair)n+=8;if(s.moment&&r.moment===s.moment)n+=6;if(s.weather&&r.weather===s.weather)n+=5;return n};

export function selectVisuals(profile,mood,count=4){
  const s=getVisualState(),rows=db.prepare("SELECT * FROM visual_assets WHERE type=? LIMIT 700").all(profile.type);
  const q={type:profile.type,origin:profile.origin,relationship:profile.stage,mood:mood.mood};
  const ranked=rows.map(r=>({...r,score:score(r,q,s)})).sort((a,b)=>b.score-a.score).slice(0,count);
  return ranked.map(r=>({...r,needsGeneration:!r.available}));
}
export function markVisualAvailable(id,filePath){db.prepare("UPDATE visual_assets SET available=1,file_path=? WHERE id=?").run(filePath,id)}
export function updateVisualState(patch){const next={...getVisualState(),...patch,updatedAt:Date.now()};saveVisualState(next);return next}
export function libraryStats(){return db.prepare("SELECT COUNT(*) total,SUM(available) available FROM visual_assets").get()}
