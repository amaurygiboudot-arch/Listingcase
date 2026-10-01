import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db,getVisualState,saveVisualState } from "./db.js";

const visualOwner=profile=>{
  const personId=String(profile?.personId||"").trim();
  const seed=String(profile?.seed||"").trim();
  if(!personId)throw new Error("visual_person_id_required");
  if(!seed)throw new Error("visual_seed_required");
  return{personId,seed};
};

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
  if(request.pose)n+=r.pose===request.pose?120:-60;
  if(request.focus)n+=r.focus===request.focus?100:-50;
  return n;
};

export function visualRequestContext(text=""){
  const l=String(text).toLowerCase();
  const ctx={};
  if(/fesses|de dos|vue de dos|derrière|derriere/.test(l)){
    ctx.view="fullbody";ctx.pose="back_view";ctx.focus="rear_body";
  }else if(/poitrine|seins?|buste|décolleté|decollete/.test(l)){
    ctx.view="halfbody";ctx.focus="upper_body";
  }else if(/corps|corp|silhouette|plein pied|en entier|entière|entiere/.test(l))ctx.view="fullbody";
  else if(/visage|portrait|ton face/.test(l))ctx.view="portrait";
  else if(/selfie/.test(l))ctx.view="selfie";
  else if(/miroir/.test(l))ctx.view="miroir";
  else if(/je peux te voir|je veux te voir/.test(l))ctx.view="threequarter";

  if(/lit|chambre|au lit|dans ton lit/.test(l)){ctx.place="chambre";ctx.activity="repos";ctx.outfit="maison";if(!ctx.view)ctx.view="threequarter"}
  else if(/plage|mer/.test(l)){ctx.place="plage";ctx.activity="marche"}
  else if(/salon|canapé|canape/.test(l)){ctx.place="salon";ctx.activity="repos";ctx.outfit="cosy"}
  else if(/cuisine/.test(l)){ctx.place="cuisine";ctx.activity="repas"}
  else if(/bureau/.test(l)){ctx.place="bureau";ctx.activity="travail"}
  else if(/salle de bains?|sdb|douche/.test(l)){ctx.place="sdb";ctx.activity="selfcare"}
  else if(/restaurant/.test(l)){ctx.place="restaurant";ctx.activity="repas"}
  else if(/parc|promenade|balade/.test(l)){ctx.place="parc";ctx.activity="marche"}
  else if(/voiture/.test(l)){ctx.place="voiture"}
  else if(/hôtel|hotel/.test(l)){ctx.place="hôtel"}
  else if(/dehors|extérieur|exterieur/.test(l)){ctx.place="exterieur"}
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
  const {personId,seed}=visualOwner(profile);
  const rows=db.prepare(`
    SELECT va.* FROM visual_assets va
    WHERE va.type=?
    ORDER BY CASE WHEN EXISTS(
      SELECT 1 FROM character_visuals cv
      WHERE cv.person_id=? AND cv.character_seed=? AND cv.slot_id=va.id
    ) THEN 0 ELSE 1 END, va.rowid
    LIMIT ?`).all(profile.type,personId,seed,limit);
  const q={type:profile.type,origin:profile.origin,relationship:profile.stage,mood:mood.mood};
  return rows.map(r=>({...r,score:score(r,q,s,request)})).sort((a,b)=>b.score-a.score);
}

export function selectAvailableVisuals(profile,mood,count=4,request={}){
  const {personId,seed}=visualOwner(profile);
  const slots=rankedSlots(profile,mood,2500,request);
  const getFile=db.prepare("SELECT file_path,mime_type,canonical FROM character_visuals WHERE person_id=? AND character_seed=? AND slot_id=?");
  const ready=[];
  for(const slot of slots){
    if(request.view&&slot.view!==request.view)continue;
    if(request.place&&slot.place!==request.place)continue;
    if(request.outfit&&slot.outfit!==request.outfit)continue;
    if(request.activity&&slot.activity!==request.activity)continue;
    if(request.pose&&slot.pose!==request.pose)continue;
    if(request.focus&&slot.focus!==request.focus)continue;
    const file=getFile.get(personId,seed,slot.id);
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

function createDynamicGenerationSlot(profile,mood,request={},fallback={}){
  const state=getVisualState();
  const owner=String(profile.personId||profile.seed||"P").replace(/[^A-Za-z0-9]/g,"").toUpperCase();
  const id=`GEN_${owner}_${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const slot={
    id,
    type:profile.type,
    origin:profile.origin,
    mood:request.mood||mood?.mood||fallback.mood||"calme",
    place:request.place||state.place||fallback.place||"salon",
    moment:request.moment||state.moment||fallback.moment||"soir",
    weather:state.weather||fallback.weather||"intérieur",
    outfit:request.outfit||state.outfit||fallback.outfit||"casual",
    hair:state.hair||fallback.hair||profile.visualIdentity?.hair||"naturelle",
    activity:request.activity||fallback.activity||"discussion",
    relationship:profile.stage||fallback.relationship||"connaissance",
    view:request.view||fallback.view||"threequarter",
    pose:request.pose||fallback.pose||null,
    focus:request.focus||fallback.focus||null,
    file_path:`library/${id}.webp`,
    available:0
  };
  db.prepare(`INSERT INTO visual_assets(id,type,origin,mood,place,moment,weather,outfit,hair,activity,relationship,view,pose,focus,file_path,available)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`)
    .run(slot.id,slot.type,slot.origin,slot.mood,slot.place,slot.moment,slot.weather,slot.outfit,slot.hair,slot.activity,slot.relationship,slot.view,slot.pose,slot.focus,slot.file_path);
  return slot;
}

export function selectGenerationSlots(profile,mood,count=1,request={}){
  const {personId,seed}=visualOwner(profile);
  const slots=rankedSlots(profile,mood,2500,request);
  const exists=db.prepare("SELECT 1 ok FROM character_visuals WHERE person_id=? AND character_seed=? AND slot_id=?");
  const strict=s=>{
    if(request.view&&s.view!==request.view)return false;
    if(request.place&&s.place!==request.place)return false;
    if(request.outfit&&s.outfit!==request.outfit)return false;
    if(request.activity&&s.activity!==request.activity)return false;
    if(request.moment&&s.moment!==request.moment)return false;
    if(request.pose&&s.pose!==request.pose)return false;
    if(request.focus&&s.focus!==request.focus)return false;
    return true;
  };
  let candidates=slots.filter(s=>strict(s)&&!exists.get(personId,seed,s.id));
  if(candidates.length<count){
    candidates=slots.filter(s=>{
      if(request.view&&s.view!==request.view)return false;
      if(request.place&&s.place!==request.place)return false;
      if(request.outfit&&s.outfit!==request.outfit)return false;
      if(request.pose&&s.pose!==request.pose)return false;
      if(request.focus&&s.focus!==request.focus)return false;
      return !exists.get(personId,seed,s.id);
    });
  }
  while(candidates.length<count){
    candidates.push(createDynamicGenerationSlot(profile,mood,request,slots[0]||{}));
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
  const {personId,seed}=visualOwner(profile);
  const originalPath=String(filePath).replace(/\\/g,"/");
  const normalizedPath=normalizeVisualFile(profile,slotId,filePath,canonical);
  if(normalizedPath!==originalPath){
    db.prepare("UPDATE message_media SET url=? WHERE url=?").run("/"+normalizedPath,"/"+originalPath);
  }
  const existing=db.prepare("SELECT person_id FROM character_visuals WHERE character_seed=? AND slot_id=?").get(seed,slotId);
  if(existing?.person_id&&existing.person_id!==personId)throw new Error("visual_owner_conflict");
  if(canonical)db.prepare("UPDATE character_visuals SET canonical=0 WHERE person_id=? AND character_seed=?").run(personId,seed);
  db.prepare(`
    INSERT INTO character_visuals(person_id,character_seed,slot_id,file_path,mime_type,canonical,created_at)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(character_seed,slot_id) DO UPDATE SET
      person_id=excluded.person_id,
      file_path=excluded.file_path,
      mime_type=excluded.mime_type,
      canonical=CASE WHEN excluded.canonical=1 THEN 1 ELSE character_visuals.canonical END
  `).run(personId,seed,slotId,normalizedPath,mimeType,canonical?1:0,Date.now());
  return db.prepare("SELECT * FROM character_visuals WHERE person_id=? AND character_seed=? AND slot_id=?").get(personId,seed,slotId);
}

export function getCanonicalVisual(profile){
  const {personId,seed}=visualOwner(profile);
  let row=db.prepare("SELECT slot_id,file_path,mime_type FROM character_visuals WHERE person_id=? AND character_seed=? AND canonical=1 ORDER BY id ASC LIMIT 1").get(personId,seed);
  if(!row&&profile.canonicalImagePath){
    const legacy=db.prepare("SELECT id,slot_id,file_path,mime_type FROM character_visuals WHERE person_id=? AND character_seed=? AND file_path=? LIMIT 1").get(personId,seed,profile.canonicalImagePath);
    if(legacy){
      db.prepare("UPDATE character_visuals SET canonical=0 WHERE person_id=? AND character_seed=?").run(personId,seed);
      db.prepare("UPDATE character_visuals SET canonical=1 WHERE id=?").run(legacy.id);
      row=legacy;
    }
  }
  if(!row)return null;
  return{slot_id:row.slot_id,file_path:row.file_path,mime_type:row.mime_type,url:"/"+String(row.file_path).replace(/^\/+/, "")};
}

export function referencedSentVisualContext(profile,text=""){
  const {personId,seed}=visualOwner(profile);
  const request=visualRequestContext(text);
  const rows=db.prepare(`SELECT mm.id,mm.created_at,mm.meta,mm.visual_id,mm.url,
    va.place,va.activity,va.view,va.outfit,va.mood,va.moment
    FROM message_media mm JOIN character_visuals cv
      ON cv.slot_id=mm.visual_id AND cv.person_id=? AND cv.character_seed=?
    LEFT JOIN visual_assets va ON va.id=mm.visual_id
    WHERE mm.kind='image' AND mm.status='ready' AND mm.url=('/'||cv.file_path)
    ORDER BY mm.id DESC LIMIT 40`).all(personId,seed);
  if(!rows.length)return null;
  const wanted=Object.entries(request).filter(([key,value])=>value&&["place","activity","view","outfit","mood","moment","pose","focus"].includes(key));
  if(!wanted.length)return null;
  let best=null,bestScore=0;
  for(const row of rows){
    let meta={};try{meta=JSON.parse(row.meta||"{}")}catch{}
    const verified=meta.verifiedVisual&&typeof meta.verifiedVisual==="object"?meta.verifiedVisual:{};
    const actual={
      place:verified.place||meta.place||row.place||null,
      activity:verified.activity||meta.activity||row.activity||null,
      view:verified.view||meta.view||row.view||null,
      outfit:verified.outfit||meta.outfit||row.outfit||null,
      mood:verified.mood||meta.mood||row.mood||null,
      moment:verified.moment||meta.moment||row.moment||null,
      hair:verified.hair||null,
      expression:verified.expression||null,
      nudity:verified.nudity||null,
      pose:verified.pose||meta.verifiedPose||meta.pose||null,
      focus:verified.focus||meta.focus||null
    };
    let score=0,conflicts=0;
    for(const [key,value] of wanted){
      if(actual[key]===value)score+=key==="place"?4:key==="view"?3:2;
      else if(actual[key])conflicts++;
    }
    if(score>bestScore&&conflicts===0){bestScore=score;best={row,meta,actual}}
  }
  if(!best)return null;
  return{
    mediaId:best.row.id,sentAt:best.row.created_at,visualId:best.row.visual_id,url:best.row.url,
    ...best.actual,
    verified:Boolean(best.meta.verifiedPose),
    matchedFromDescription:true
  };
}

export function lastSentVisualContext(profile){
  const {personId,seed}=visualOwner(profile);
  const row=db.prepare(`SELECT mm.id,mm.created_at,mm.meta,mm.visual_id,mm.url,
    va.place,va.activity,va.view,va.outfit,va.mood,va.moment
    FROM message_media mm JOIN character_visuals cv
      ON cv.slot_id=mm.visual_id AND cv.person_id=? AND cv.character_seed=?
    LEFT JOIN visual_assets va ON va.id=mm.visual_id
    WHERE mm.kind='image' AND mm.status='ready' AND mm.url=('/'||cv.file_path)
    ORDER BY mm.id DESC LIMIT 1`).get(personId,seed);
  if(!row)return null;
  let meta={};try{meta=JSON.parse(row.meta||"{}")}catch{}
  const verified=meta.verifiedVisual&&typeof meta.verifiedVisual==="object"?meta.verifiedVisual:{};
  return{
    mediaId:row.id,sentAt:row.created_at,
    place:verified.place||meta.place||row.place||null,
    activity:verified.activity||meta.activity||row.activity||null,
    view:verified.view||meta.view||row.view||null,
    outfit:verified.outfit||meta.outfit||row.outfit||null,
    mood:verified.mood||meta.mood||row.mood||null,
    moment:verified.moment||meta.moment||row.moment||null,
    hair:verified.hair||null,
    expression:verified.expression||null,
    nudity:verified.nudity||null,
    pose:verified.pose||meta.verifiedPose||null,
    verified:Boolean(meta.qualityVerified||meta.verifiedPose||Object.keys(verified).length)
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
  const {personId,seed}=visualOwner(profile);
  const available=Number(db.prepare("SELECT COUNT(*) c FROM character_visuals WHERE person_id=? AND character_seed=?").get(personId,seed).c||0);
  return{total,available};
}
