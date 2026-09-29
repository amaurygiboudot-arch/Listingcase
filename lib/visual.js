import fs from "node:fs";
import path from "node:path";
import { db,getVisualState,saveVisualState } from "./db.js";

const score=(r,q,s,request={})=>{
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

  if(request.view)n+=r.view===request.view?90:-25;
  if(request.place)n+=r.place===request.place?70:-15;
  if(request.outfit)n+=r.outfit===request.outfit?35:-5;
  if(request.activity)n+=r.activity===request.activity?30:-4;
  if(request.moment)n+=r.moment===request.moment?20:0;
  return n;
};

export function visualRequestContext(text=""){
  const l=String(text).toLowerCase();
  const ctx={};
  if(/corps|corp|silhouette|plein pied|en entier|entière|entiere/.test(l))ctx.view="fullbody";
  else if(/visage|portrait|ton face/.test(l))ctx.view="portrait";
  else if(/selfie/.test(l))ctx.view="selfie";
  else if(/miroir/.test(l))ctx.view="miroir";
  else if(/je peux te voir|je veux te voir/.test(l))ctx.view="threequarter";

  if(/lit|chambre|au lit|dans ton lit/.test(l)){ctx.place="chambre";ctx.activity="repos";ctx.outfit="maison";if(!ctx.view)ctx.view="threequarter"}
  else if(/plage|mer/.test(l)){ctx.place="plage";ctx.activity="marche"}
  else if(/salon|canapé|canape/.test(l)){ctx.place="salon";ctx.activity="repos";ctx.outfit="cosy"}
  else if(/cuisine/.test(l)){ctx.place="cuisine";ctx.activity="repas"}
  else if(/parc|promenade|balade/.test(l)){ctx.place="parc";ctx.activity="marche"}
  else if(/voiture/.test(l)){ctx.place="voiture"}
  else if(/hôtel|hotel/.test(l)){ctx.place="hôtel"}
  else if(/sport|salle/.test(l)){ctx.place="salle de sport";ctx.activity="sport";ctx.outfit="sport"}

  if(/travail|boulot/.test(l)){ctx.activity="travail";ctx.outfit="travail"}
  if(/élégant|elegant|chic|soirée|soiree/.test(l))ctx.outfit="élégant";
  if(/cocoon|pyjama|détendu|detendu/.test(l))ctx.outfit="cosy";
  if(/matin|réveil|reveil/.test(l))ctx.moment="matin";
  if(/soir|ce soir/.test(l))ctx.moment="soir";
  if(/nuit/.test(l))ctx.moment="nuit";
  return ctx;
}

function rankedSlots(profile,mood,limit=2500,request={}){
  const s=getVisualState();
  const rows=db.prepare("SELECT * FROM visual_assets WHERE type=? LIMIT ?").all(profile.type,limit);
  const q={type:profile.type,origin:profile.origin,relationship:profile.stage,mood:mood.mood};
  return rows.map(r=>({...r,score:score(r,q,s,request)})).sort((a,b)=>b.score-a.score);
}

export function selectAvailableVisuals(profile,mood,count=4,request={}){
  const slots=rankedSlots(profile,mood,2500,request);
  const getFile=db.prepare("SELECT file_path,mime_type,canonical FROM character_visuals WHERE character_seed=? AND slot_id=?");
  const ready=[];
  for(const slot of slots){
    if(request.view&&slot.view!==request.view)continue;
    if(request.place&&slot.place!==request.place)continue;
    if(request.outfit&&slot.outfit!==request.outfit)continue;
    if(request.activity&&slot.activity!==request.activity)continue;
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

export function selectGenerationSlots(profile,mood,count=1,request={}){
  const slots=rankedSlots(profile,mood,2500,request);
  const exists=db.prepare("SELECT 1 ok FROM character_visuals WHERE character_seed=? AND slot_id=?");
  const strict=s=>{
    if(request.view&&s.view!==request.view)return false;
    if(request.place&&s.place!==request.place)return false;
    if(request.outfit&&s.outfit!==request.outfit)return false;
    if(request.activity&&s.activity!==request.activity)return false;
    if(request.moment&&s.moment!==request.moment)return false;
    return true;
  };
  let candidates=slots.filter(s=>strict(s)&&!exists.get(profile.seed,s.id));
  if(candidates.length<count){
    candidates=slots.filter(s=>{
      if(request.view&&s.view!==request.view)return false;
      if(request.place&&s.place!==request.place)return false;
      if(request.outfit&&s.outfit!==request.outfit)return false;
      return !exists.get(profile.seed,s.id);
    });
  }
  return candidates.slice(0,count).map(s=>({...s,...request,needsGeneration:true}));
}

export function selectVisuals(profile,mood,count=4,request={}){
  const ready=selectAvailableVisuals(profile,mood,count,request);
  if(ready.length>=count)return ready;
  return [...ready,...selectGenerationSlots(profile,mood,count-ready.length,request)];
}

const fileToken=(value,lower=true)=>{
  let s=String(value||"inconnu").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"inconnu";
  return lower?s.toLowerCase():s;
};

function normalizeVisualFile(profile,slotId,filePath,canonical){
  const source=path.resolve(filePath);
  if(!fs.existsSync(source))return String(filePath).replace(/\\/g,"/");
  const slot=db.prepare("SELECT * FROM visual_assets WHERE id=?").get(slotId)||{};
  const ext=(path.extname(source)||".png").toLowerCase();
  const personId=String(profile.personId||profile.seed?.slice(0,8)||"P").toUpperCase();
  const name=fileToken(profile.name||"personne",false);
  const folder=`${personId}_${name}`;
  const dir=path.resolve("library",folder);
  fs.mkdirSync(dir,{recursive:true});
  const base=canonical
    ?`${personId}_${name}_canonical`
    :[
      personId,
      name,
      fileToken(profile.type),
      fileToken(slot.view||"portrait"),
      fileToken(slot.place),
      fileToken(slot.outfit),
      fileToken(slot.mood),
      fileToken(slot.moment)
    ].join("_");

  const currentBase=path.basename(source,ext);
  if(path.dirname(source)===dir&&currentBase.startsWith(base+"_v"))return path.relative(path.resolve("."),source).replace(/\\/g,"/");

  const escaped=base.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const re=new RegExp("^"+escaped+"_v(\\d+)"+ext.replace(".","\\.")+"$","i");
  let version=0;
  for(const f of fs.readdirSync(dir)){
    const m=f.match(re);
    if(m)version=Math.max(version,Number(m[1])||0);
  }
  const target=path.join(dir,`${base}_v${String(version+1).padStart(2,"0")}${ext}`);
  if(path.resolve(target)!==source)fs.renameSync(source,target);
  return path.relative(path.resolve("."),target).replace(/\\/g,"/");
}

export function saveCharacterVisual(profile,slotId,filePath,mimeType="image/png",{canonical=false}={}){
  const originalPath=String(filePath).replace(/\\/g,"/");
  const normalizedPath=normalizeVisualFile(profile,slotId,filePath,canonical);
  if(normalizedPath!==originalPath){
    db.prepare("UPDATE message_media SET url=? WHERE url=?").run("/"+normalizedPath,"/"+originalPath);
  }
  db.prepare(`
    INSERT INTO character_visuals(character_seed,slot_id,file_path,mime_type,canonical,created_at)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(character_seed,slot_id) DO UPDATE SET
      file_path=excluded.file_path,
      mime_type=excluded.mime_type,
      canonical=MAX(character_visuals.canonical,excluded.canonical)
  `).run(profile.seed,slotId,normalizedPath,mimeType,canonical?1:0,Date.now());
  return db.prepare("SELECT * FROM character_visuals WHERE character_seed=? AND slot_id=?").get(profile.seed,slotId);
}

export function getCanonicalVisual(profile){
  const row=db.prepare("SELECT slot_id,file_path,mime_type FROM character_visuals WHERE character_seed=? ORDER BY canonical DESC,id ASC LIMIT 1").get(profile.seed);
  if(!row)return null;
  return{...row,url:"/"+String(row.file_path).replace(/^\/+/, "")};
}

export function lastSentVisualContext(profile){
  const row=db.prepare(`SELECT mm.id,mm.created_at,mm.meta,mm.visual_id,mm.url,
    va.place,va.activity,va.view,va.outfit,va.mood,va.moment
    FROM message_media mm JOIN character_visuals cv
      ON cv.slot_id=mm.visual_id AND cv.character_seed=?
    LEFT JOIN visual_assets va ON va.id=mm.visual_id
    WHERE mm.kind='image' AND mm.status='ready' AND mm.url=('/'||cv.file_path)
    ORDER BY mm.id DESC LIMIT 1`).get(profile.seed);
  if(!row)return null;
  let meta={};try{meta=JSON.parse(row.meta||"{}")}catch{}
  return{
    mediaId:row.id,sentAt:row.created_at,
    place:meta.place||row.place||null,
    activity:meta.activity||row.activity||null,
    view:meta.view||row.view||null,
    outfit:meta.outfit||row.outfit||null,
    mood:meta.mood||row.mood||null,
    moment:meta.moment||row.moment||null,
    // A generated image can differ from its prompt: no inferred pose or
    // expression is claimed without a separate visual inspection result.
    pose:meta.verifiedPose||null,
    verified: Boolean(meta.verifiedPose)
  };
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
