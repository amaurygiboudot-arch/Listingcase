import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db,getSetting,setSetting,getPartner,savePartner,clearPartner,listPartners,addMessage,addMessageMedia,getMessageMedia,updateMessageMedia,recentMessages,addMemory,recentMemories,seedVisualSlots,createPendingChat,getPendingChat,deletePendingChat,ensurePersonId } from "./lib/db.js";
import { createProfile,dailyMood,advanceRelationship,visualDecision,ensureVisualIdentity,ensureBodyIdentity } from "./lib/profile.js";
import { deterministicReply,sanitizeModelReply } from "./lib/dialogue-guard.js";
import { recordEvent,noteInteraction,absenceState,applyAbsence,emotionalOverlay,decayEmotions,memoryContext,initiativeDecision } from "./lib/memory.js";
import { seedInitialPreferences,learnUserPreference,learnPartnerPreferenceFromReply,preferenceContext } from "./lib/preferences.js";
import { runLifeTick,latestExperiences,pendingExperienceStory,markExperienceTold } from "./lib/experiences.js";
import { ensureRoutine,ensureSocialCircle,ensureGoals,lifeContext } from "./lib/routine.js";
import { chatWithModel,fallbackReply,modelStatus,warmModel,unloadModel,buildCloudMessages } from "./lib/model.js";
import { selectVisuals,selectAvailableVisuals,selectGenerationSlots,saveCharacterVisual,libraryStats,visualRequestContext,getCanonicalVisual,lastSentVisualContext,referencedSentVisualContext } from "./lib/visual.js";
import { imageProviderStatus,buildVisualPrompt,generateVisual,importImageSource } from "./lib/image-provider.js";
import { ensureLocalImageRuntime,localImageRuntimeInstalled,stopOwnedLocalImageRuntime } from "./lib/local-image-runtime.js";
import { ensureWorldPerson,listWorldPeople,relatePeople,witnessEvent,confideFact,rememberFacts,keepSecret,tellFact,socialContext } from "./lib/social-world.js";
import { resolveVisualScene,noteVisualScene } from "./lib/scene-continuity.js";
import { activateCharacter,startNewCharacter,deleteActiveCharacter } from "./lib/character-store.js";
import { enqueueLocalMediaGeneration,localMediaQueueStatus } from "./lib/local-media-queue.js";
import { ensureLivingIdentity,updateLivingCurrentState,recordClassifiedLivingEvent,syncLivingPreference,livingContext,seedLivingMemory } from "./lib/living-identity.js";
import { canonicalPersonaPublic,canonicalRelationshipMemory } from "./lib/canonical-persona.js";
import { startRemoteTunnel } from "./lib/remote-tunnel.js";

const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||8787);
const LOCAL_ONLY=String(process.env.LOCAL_ONLY??"1")!=="0";
const ENV_ACCESS_TOKEN=String(process.env.APP_ACCESS_TOKEN||"").trim();
const ACCESS_TOKEN=ENV_ACCESS_TOKEN||getSetting("appAccessToken","")||crypto.randomBytes(32).toString("base64url");
if(!ENV_ACCESS_TOKEN&&!getSetting("appAccessToken",""))setSetting("appAccessToken",ACCESS_TOKEN);

function seedPredefinedCharacters(){
  const file=path.resolve(root,"config","predefined-characters.json");
  if(!fs.existsSync(file))return 0;
  let profiles=[];try{profiles=JSON.parse(fs.readFileSync(file,"utf8"))}catch{return 0}
  if(!Array.isArray(profiles))return 0;
  const insert=db.prepare("INSERT OR IGNORE INTO characters(person_id,json,created_at,updated_at) VALUES(?,?,?,?)");
  const get=db.prepare("SELECT json FROM characters WHERE person_id=?");
  const update=db.prepare("UPDATE characters SET json=?,updated_at=? WHERE person_id=?");
  const structural=["livingIdentityEnabled","livingIdentityVersion","livingIdentitySource","familyId"];
  let added=0;
  for(const profile of profiles){
    if(!profile?.personId||!profile?.seed||!profile?.name)continue;
    const now=Date.now(),createdAt=Number(profile.createdAt||now);
    const result=insert.run(profile.personId,JSON.stringify(profile),createdAt,now);
    added+=Number(result.changes||0);
    const stored=get.get(profile.personId);
    let effective=profile;
    if(stored){
      try{
        const current=JSON.parse(stored.json),next={...current};
        let changed=false;
        for(const key of structural){
          if(next[key]===undefined&&profile[key]!==undefined){next[key]=profile[key];changed=true}
        }
        if(changed)update.run(JSON.stringify(next),now,profile.personId);
        effective=next;
      }catch{}
    }
    ensureLivingIdentity(effective);
    const canonicalMemory=canonicalRelationshipMemory(effective);
    if(canonicalMemory)seedLivingMemory(effective,canonicalMemory);
    const active=getPartner();
    if(active?.personId===effective.personId){
      let changed=false;
      for(const key of structural){
        if(active[key]===undefined&&effective[key]!==undefined){active[key]=effective[key];changed=true}
      }
      if(changed)savePartner(active);
    }
  }
  return added;
}

seedVisualSlots();
seedPredefinedCharacters();

function seedChloeReferenceVisuals(){
  const row=db.prepare("SELECT json FROM characters WHERE person_id=?").get("CHLOE_001");
  if(!row)return 0;
  let profile=null;try{profile=JSON.parse(row.json)}catch{return 0}
  if(!profile?.seed)return 0;
  const refs=[
    {
      id:"CANONICAL_CHLOE_001",
      file:"library/CHLOE_001_Chloe/CHLOE_001_Chloe_canonical_v02.jpg",
      mood:"calme",place:"bureau",moment:"après-midi",weather:"intérieur",
      outfit:"travail",hair:"attachée",activity:"travail",view:"fullbody",canonical:1
    },
    {
      id:"REF_CHLOE_001_V01",
      file:"library/CHLOE_001_Chloe/CHLOE_001_Chloe_canonical_v01.jpg",
      mood:"tendre",place:"chambre",moment:"soir",weather:"intérieur",
      outfit:"maison",hair:"attachée",activity:"repos",view:"fullbody",canonical:0
    }
  ];
  const asset=db.prepare(`INSERT INTO visual_assets
    (id,type,origin,mood,place,moment,weather,outfit,hair,activity,relationship,view,file_path,available)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type,origin=excluded.origin,mood=excluded.mood,place=excluded.place,
      moment=excluded.moment,weather=excluded.weather,outfit=excluded.outfit,hair=excluded.hair,
      activity=excluded.activity,relationship=excluded.relationship,view=excluded.view,
      file_path=excluded.file_path,available=1`);
  const visual=db.prepare(`INSERT OR IGNORE INTO character_visuals
    (person_id,character_seed,slot_id,file_path,mime_type,canonical,created_at)
    VALUES(?,?,?,?,?,?,?)`);
  let added=0;
  for(const ref of refs){
    const abs=path.resolve(root,ref.file);
    if(!fs.existsSync(abs))continue;
    asset.run(ref.id,profile.type,profile.origin,ref.mood,ref.place,ref.moment,ref.weather,
      ref.outfit,ref.hair,ref.activity,profile.stage,ref.view,ref.file);
    const result=visual.run(profile.personId,profile.seed,ref.id,ref.file,"image/jpeg",ref.canonical,Date.now());
    added+=Number(result.changes||0);
  }
  return added;
}
seedChloeReferenceVisuals();

function dedupeCharacterNamesOnce(){
  if(getSetting("dedupeCharacterNamesV1",false))return 0;
  const activeId=getPartner()?.personId||getSetting("activePersonId",null);
  const rows=db.prepare("SELECT person_id,json,created_at FROM characters ORDER BY created_at,person_id").all();
  const groups=new Map();
  for(const row of rows){
    let profile={};try{profile=JSON.parse(row.json)}catch{}
    const key=String(profile.name||row.person_id).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const delSession=db.prepare("DELETE FROM character_sessions WHERE person_id=?");
  const delVisual=db.prepare("DELETE FROM character_visuals WHERE person_id=?");
  const delCharacter=db.prepare("DELETE FROM characters WHERE person_id=?");
  const delScene=db.prepare("DELETE FROM settings WHERE key=?");
  let removed=0;
  db.exec("BEGIN");
  try{
    for(const group of groups.values()){
      if(group.length<2)continue;
      const keeper=group.find(x=>x.person_id===activeId)||group[0];
      for(const row of group){
        if(row.person_id===keeper.person_id)continue;
        delSession.run(row.person_id);
        delVisual.run(row.person_id);
        delCharacter.run(row.person_id);
        delScene.run(`visualScene:${row.person_id}`);
        removed++;
      }
    }
    setSetting("dedupeCharacterNamesV1",true);
    db.exec("COMMIT");
  }catch(e){db.exec("ROLLBACK");throw e}
  return removed;
}
dedupeCharacterNamesOnce();
const dialogueGuardVersion=3;
if(getSetting("dialogueGuardVersion",0)<dialogueGuardVersion){
  setSetting("dialogueGuardVersion",dialogueGuardVersion);
  setSetting("dialogueContextAfter",Date.now());
}

const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(data))};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}};
const apiAuthorized=req=>{
  if(isDirectLanRequest(req))return true;
  if(!ACCESS_TOKEN)return true;
  const direct=String(req.headers["x-app-token"]||"");
  const auth=String(req.headers.authorization||"");
  const bearer=auth.startsWith("Bearer ")?auth.slice(7):"";
  const cookieHeader=String(req.headers.cookie||"");
  const cookiePart=cookieHeader.split(";").map(x=>x.trim()).find(x=>x.startsWith("hp_session="))||"";
  let cookieToken="";
  try{cookieToken=decodeURIComponent(cookiePart.slice("hp_session=".length))}catch{}
  const supplied=direct||bearer||cookieToken;
  if(!supplied||supplied.length!==ACCESS_TOKEN.length)return false;
  try{return crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(ACCESS_TOKEN))}catch{return false}
};

const isPrivateIp=raw=>{
  const ip=String(raw||"").replace(/^::ffff:/,"");
  if(ip==="::1"||ip==="127.0.0.1")return true;
  if(/^10\./.test(ip)||/^192\.168\./.test(ip))return true;
  const m=ip.match(/^172\.(\d+)\./);return Boolean(m&&Number(m[1])>=16&&Number(m[1])<=31);
};
const isDirectLanRequest=req=>{
  if(req.headers["cf-connecting-ip"]||req.headers["x-forwarded-for"]||req.headers["x-real-ip"])return false;
  return isPrivateIp(req.socket?.remoteAddress);
};
const isVisualRequest=text=>/(photo|photos|image|images|montre[- ]?moi|montre\s+(?:ton|ta|tes)|fait voir|fais voir|je peux te voir|voir de toi|voir\s+(?:ton|ta|tes)|ton corps|ton corp|ta tenue|ton apparence|visage|portrait|selfie|poitrine|seins?|buste|décolleté|decollete|fesses|de dos|vue de dos|à quoi tu ressembles|a quoi tu ressembles)/i.test(String(text||""));
const isVisualReferenceOnly=text=>{
  const s=String(text||"");
  const mentions=/(photo|image|celle|celle-ci|celle là|celle-la)/i.test(s);
  const describes=/(où|ou|dans laquelle|sur laquelle|avec|dans (?:ta|ton|le|la)|quand tu|où tu)/i.test(s);
  const asksNew=/(montre[- ]?moi|montre\s+(?:ton|ta|tes)|envoie|renvoie|fait voir|fais voir|génère|genere|crée|cree|prends? (?:une )?photo|je veux te voir|je peux te voir)/i.test(s);
  return mentions&&describes&&!asksNew;
};
const cloudLlmStatus=()=>({configured:true,provider:"puter-client",model:"gemini-3.1-flash-lite",client:true});
const cloudImageStatus=()=>({configured:true,provider:"puter-client",client:true,local:false});
const currentLlmStatus=()=>LOCAL_ONLY?modelStatus():Promise.resolve(cloudLlmStatus());
const currentImageStatus=()=>LOCAL_ONLY?imageProviderStatus():Promise.resolve(cloudImageStatus());

function repairStaleGenericPhotoErrors(profile){
  if(!profile?.personId)return 0;
  const key=`photoErrorRepairV3:${profile.personId}`;
  if(getSetting(key,false))return 0;
  const canonical=getCanonicalVisual(profile);
  if(!canonical)return 0;
  const rows=db.prepare("SELECT id,message_id,meta FROM message_media WHERE kind='image' AND status='error' AND url IS NULL ORDER BY id").all();
  const previousUser=db.prepare("SELECT id,text FROM messages WHERE id<? AND role='user' ORDER BY id DESC LIMIT 1");
  let fixed=0,removed=0;
  const remove=db.prepare("DELETE FROM message_media WHERE id=?");
  for(const row of rows){
    const user=previousUser.get(row.message_id);
    let meta={};try{meta=row.meta?JSON.parse(row.meta):{}}catch{}
    if(user&&!isVisualRequest(user.text)&&meta.imageProvider==="comfyui-local"&&meta.failure==="generation_failed"){
      remove.run(row.id);
      removed++;
      continue;
    }
    if(!user||!isVisualRequest(user.text))continue;
    const request=visualRequestContext(user.text);
    if(Object.keys(request).length)continue;
    updateMessageMedia(row.id,{
      url:canonical.url,
      status:"ready",
      alt:`Photo de ${profile.name}`,
      visualId:canonical.slot_id,
      meta:{...meta,canonical:true,repairedFromHistoricalFailure:true,repairedAt:Date.now()}
    });
    fixed++;
  }
  setSetting(key,true);
  return fixed+removed;
}

function hasPendingLocalImage(personId){
  if(!personId)return false;
  return recentMessages(100).some(message=>(message.media||[]).some(media=>
    media.status==="pending"&&media.meta?.personId===personId&&media.meta?.localProvider
  ));
}

function resumePendingLocalMedia(profile){
  if(!profile?.personId)return 0;
  let resumed=0;
  for(const message of recentMessages(100)){
    for(const media of message.media||[]){
      const meta=media.meta||{};
      if(media.status!=="pending"||!meta.localProvider||!meta.slot||!meta.prompt||!meta.referencePath)continue;
      if(enqueueLocalMediaGeneration({
        personId:profile.personId,
        mediaId:media.id,
        profile:JSON.parse(JSON.stringify(profile)),
        slot:meta.slot,
        prompt:meta.prompt,
        referencePath:meta.referencePath,
        requestVisual:meta.requestVisual||{}
      }))resumed++;
    }
  }
  return resumed;
}

async function state(){
  const partner=getPartner();
  if(partner){
    let dirty=false;
    if(!partner.personId){ensurePersonId(partner);dirty=true}
    if(!partner.visualIdentity){ensureVisualIdentity(partner);dirty=true}
    if(!partner.bodyIdentity){ensureBodyIdentity(partner);dirty=true}
    const canonical=getCanonicalVisual(partner);
    if(canonical&&partner.canonicalImagePath!==canonical.file_path){
      const migrated=saveCharacterVisual(partner,canonical.slot_id,canonical.file_path,canonical.mime_type,{canonical:true});
      partner.canonicalImagePath=migrated.file_path;
      dirty=true;
    }
    if(dirty)savePartner(partner);
    repairStaleGenericPhotoErrors(partner);
    resumePendingLocalMedia(partner);
  }
  const mood=partner?dailyMood(partner):null;
  const life=partner?runLifeTick(partner,mood):null;
  const lifestyle=partner?lifeContext(partner,mood):null;
  let livingIdentity=null;
  if(partner?.livingIdentityEnabled){
    ensureLivingIdentity(partner);
    updateLivingCurrentState(partner,{mood});
    livingIdentity=livingContext(partner);
  }
  const imageProvider=await currentImageStatus();
  return{
    adultConfirmed:getSetting("adultConfirmed",false),
    partner,
    characters:listPartners(),
    mood,
    life,
    lifestyle,
    canonicalPersona:partner?canonicalPersonaPublic(partner):null,
    livingIdentity,
    experiences:latestExperiences(10),
    pendingStory:pendingExperienceStory(),
    messages:recentMessages(40),
    memories:memoryContext(12),
    preferences:{partner:preferenceContext("partner",18),user:preferenceContext("user",18)},
    emotional:emotionalOverlay(),
    absence:partner?absenceState(partner):null,
    library:libraryStats(partner),
    serverMode:LOCAL_ONLY?"local":"cloud",
    cloudClientAllowed:!LOCAL_ONLY,
    imageGeneration:{
      mode:LOCAL_ONLY?"local-only":"hybrid-cloud",
      queue:localMediaQueueStatus(),
      configured:Boolean(imageProvider.configured),
      provider:imageProvider.provider||"none",
      blocked:false
    },
    providers:{
      llm:await currentLlmStatus(),
      image:imageProvider
    }
  };
}

const importSchema={
  settings:["key","value"],
  partner:["id","json","created_at"],
  characters:["person_id","json","created_at","updated_at"],
  character_sessions:["person_id","state_json","updated_at"],
  messages:["id","role","text","created_at"],
  message_media:["id","message_id","kind","url","status","alt","visual_id","meta","created_at"],
  memories:["id","kind","content","weight","created_at"],
  preferences:["owner","topic","score","confidence","reason","exposures","updated_at"],
  experiences:["id","slot","topic","kind","outcome","intensity","note","created_at"],
  social_contacts:["id","name","relation","closeness","energy","created_at"],
  goals:["id","title","category","progress","priority","status","updated_at"],
  character_visuals:["id","person_id","character_seed","slot_id","file_path","mime_type","canonical","created_at"],
  visual_state:["id","json"],
  world_people:["person_id","name","temperament"],
  world_relations:["owner_id","other_id","kind","trust","closeness"],
  world_facts:["fact_id","subject_id","predicate","detail","happened_at","sensitivity"],
  world_knowledge:["owner_id","fact_id","source_id","channel","confidence","learned_at","secret"],
  world_transmissions:["id","fact_id","speaker_id","listener_id","said_at","confidence"],
  families:["family_id","family_history_json","common_traits_json","created_at","updated_at"],
  living_identity:["person_id","family_id","individual_seed","temperament_seed","origin_json","personality_json","past_json","created_at","updated_at"],
  living_events:["event_id","person_id","happened_at","category","people_json","description","emotion","intensity","importance","consequences","relation_impact_json","personality_impact_json","certainty","source"],
  living_memories:["memory_id","person_id","kind","content","emotional_weight","certainty","source","created_at"],
  living_preferences:["person_id","category","value","strength","evidence_count","reason","first_observed_at","last_confirmed_at"],
  living_current_state:["person_id","mood","energy","stress","social_need","active_needs_json","active_interests_json","updated_at"],
  living_evolution:["id","person_id","change_type","change_json","cause_event_id","created_at"]
};

function importStateBundle(bundle){
  const tables=bundle?.tables||{};
  db.exec("PRAGMA foreign_keys=OFF; BEGIN");
  try{
    for(const table of Object.keys(importSchema).reverse())db.exec(`DELETE FROM ${table}`);
    for(const [table,cols] of Object.entries(importSchema)){
      const rows=Array.isArray(tables[table])?tables[table]:[];
      if(!rows.length)continue;
      const placeholders=cols.map(()=>"?").join(",");
      const insert=db.prepare(`INSERT INTO ${table}(${cols.join(",")}) VALUES(${placeholders})`);
      for(const row of rows)insert.run(...cols.map(c=>row[c]??null));
    }
    db.exec("COMMIT; PRAGMA foreign_keys=ON");
  }catch(e){
    try{db.exec("ROLLBACK; PRAGMA foreign_keys=ON")}catch{}
    throw e;
  }

  for(const file of Array.isArray(bundle?.files)?bundle.files:[]){
    const rel=String(file.path||"").replace(/\\/g,"/");
    if(!/^library\/[A-Za-z0-9_./-]+$/.test(rel)||rel.includes(".."))continue;
    const target=path.resolve(root,rel);
    if(!target.startsWith(root))continue;
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,Buffer.from(String(file.base64||""),"base64"));
  }
}

async function api(req,res,url){
  if(req.method==="POST"&&url.pathname==="/api/pair"){
    if(!isDirectLanRequest(req))return json(res,403,{error:"pairing_requires_local_network"});
    return json(res,200,{ok:true,token:ACCESS_TOKEN});
  }
  if(req.method==="POST"&&url.pathname==="/api/admin/import-state"){
    if(String(process.env.MIGRATION_ENABLED||"0")!=="1")return json(res,403,{error:"migration_disabled"});
    const bundle=await body(req);
    importStateBundle(bundle);
    return json(res,200,{ok:true,state:await state()});
  }
  if(req.method==="GET"&&url.pathname==="/api/health")return json(res,200,{ok:true,mode:LOCAL_ONLY?"local":"cloud",library:libraryStats(),providers:{llm:await currentLlmStatus(),image:await currentImageStatus()}});
  if(req.method==="POST"&&url.pathname==="/api/session"){
    const secure=String(req.headers["x-forwarded-proto"]||"").toLowerCase()==="https"||Boolean(req.headers["cf-connecting-ip"]);
    const cookie=`hp_session=${encodeURIComponent(ACCESS_TOKEN)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure?"; Secure":""}`;
    res.writeHead(200,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","set-cookie":cookie});
    res.end(JSON.stringify({ok:true}));
    return;
  }
  if(req.method==="GET"&&url.pathname==="/api/providers")return json(res,200,{llm:await currentLlmStatus(),image:await currentImageStatus()});
  if(req.method==="GET"&&url.pathname==="/api/state")return json(res,200,await state());
  if(req.method==="GET"&&url.pathname==="/api/world/people")return json(res,200,{people:listWorldPeople()});
  if(req.method==="GET"&&url.pathname==="/api/world/knowledge"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    return json(res,200,{facts:rememberFacts(p.personId,{subjectId:url.searchParams.get("subjectId")||null})});
  }
  if(req.method==="POST"&&url.pathname==="/api/world/person"){
    const b=await body(req);return json(res,201,{person:ensureWorldPerson(b.personId,b.name,b.temperament)});
  }
  if(req.method==="POST"&&url.pathname==="/api/world/relation"){
    const b=await body(req);relatePeople(b.ownerId,b.otherId,b.kind,b);return json(res,200,{ok:true});
  }
  if(req.method==="POST"&&url.pathname==="/api/world/event"){
    const b=await body(req);return json(res,201,{factId:witnessEvent(b)});
  }
  if(req.method==="POST"&&url.pathname==="/api/world/confide"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req);return json(res,201,{factId:confideFact(p.personId,b)});
  }
  if(req.method==="POST"&&url.pathname==="/api/world/secret"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req);keepSecret(p.personId,b.factId,b.secret!==false);return json(res,200,{ok:true});
  }
  if(req.method==="POST"&&url.pathname==="/api/world/tell"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req);return json(res,200,{knowledge:tellFact(p.personId,b.listenerId,b.factId,{overrideSecret:b.overrideSecret===true})});
  }
  if(req.method==="POST"&&url.pathname==="/api/adult"){const b=await body(req);setSetting("adultConfirmed",Boolean(b.confirmed));return json(res,200,await state())}
  if(req.method==="POST"&&url.pathname==="/api/partner"){
    if(!getSetting("adultConfirmed",false))return json(res,403,{error:"adult_confirmation_required"});
    const existingNames=listPartners().map(x=>x.name);
    const b=await body(req),p=ensurePersonId(ensureVisualIdentity(createProfile(Array.isArray(b.interests)?b.interests:[],existingNames)));
    startNewCharacter(p);
    ensureWorldPerson(p.personId,p.name,p.personality?.directness||"calme");
    seedInitialPreferences(p);
    ensureRoutine(p);ensureSocialCircle(p);ensureGoals(p);
    noteInteraction();
    addMessage("partner","Salut. On ne se connaît pas encore vraiment, donc je préfère qu’on commence simplement 😄. Qu’est-ce que tu veux savoir sur moi ?");
    return json(res,201,await state());
  }
  if(req.method==="POST"&&url.pathname==="/api/partner/select"){
    const b=await body(req),p=activateCharacter(b.personId);
    if(!p)return json(res,404,{error:"character_not_found"});
    ensureWorldPerson(p.personId,p.name,p.personality?.directness||"calme");
    return json(res,200,await state());
  }
  if(req.method==="POST"&&url.pathname==="/api/partner/delete"){
    deleteActiveCharacter();
    return json(res,200,await state());
  }
  if(req.method==="POST"&&url.pathname==="/api/reset"){deleteActiveCharacter();return json(res,200,await state())}
  if(req.method==="POST"&&url.pathname==="/api/visual/canonical"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),src=String(b.imageSrc||"");
    if(!src)return json(res,400,{error:"canonical_image_missing"});
    try{
      const slotId=`CANONICAL_${p.personId}`;
      const imported=await importImageSource(src,slotId);
      const saved=saveCharacterVisual(p,slotId,imported.filePath,imported.mimeType,{canonical:true});
      p.canonicalImagePath=saved.file_path;
      savePartner(p);
      return json(res,200,{ok:true,canonical:{url:"/"+String(saved.file_path).replace(/^\/+/, ""),filePath:saved.file_path},state:await state()});
    }catch(e){
      console.error("CANONICAL:",e.message);
      return json(res,500,{error:"canonical_import_failed",message:e.message});
    }
  }
  if(req.method==="POST"&&url.pathname==="/api/visual/select"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),text=String(b.text||"photos"),m=dailyMood(p),decision=visualDecision(p,m,text);
    const rawRequest=visualRequestContext(text);
    const hasExplicitScene=Object.keys(rawRequest).length>0;
    const scene=hasExplicitScene?resolveVisualScene(p,rawRequest):{allowed:true,request:{...rawRequest}};
    const desiredCount=!/\bphotos\b/i.test(text)?1:decision.count;
    let visuals=decision.accept&&scene.allowed?selectAvailableVisuals(p,m,desiredCount,scene.request):[];
    if(decision.accept&&scene.allowed&&visuals.length<desiredCount&&!hasExplicitScene){
      const canonical=getCanonicalVisual(p);
      if(canonical&&!visuals.some(v=>v.url===canonical.url)){
        visuals.push({
          id:canonical.slot_id,
          file_path:canonical.file_path,
          mime_type:canonical.mime_type,
          url:canonical.url,
          canonical:true,
          needsGeneration:false,
          view:rawRequest.view||null
        });
      }
    }
    const imageStatus=await currentImageStatus();
    const enriched=visuals.slice(0,desiredCount).map(v=>({...v,prompt:v.needsGeneration?buildVisualPrompt(p,v,{}):null}));
    return json(res,200,{decision:{...decision,count:desiredCount},scene,visuals:enriched,imageProvider:imageStatus});
  }
  if(req.method==="POST"&&url.pathname==="/api/chat"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),text=String(b.text||"").trim();if(!text)return json(res,400,{error:"empty_message"});
    const contextAfter=getSetting("dialogueContextAfter",0);
    const previous=recentMessages(20).filter(m=>m.created_at>=contextAfter);
    const absence=applyAbsence(p);
    noteInteraction();
    addMessage("user",text);
    const classifiedEvent=recordEvent(text);
    learnUserPreference(text);
    ensureVisualIdentity(p);ensureBodyIdentity(p);advanceRelationship(p);savePartner(p);const mood=dailyMood(p);const lifestyle=lifeContext(p,mood);
    let livingIdentity=null;
    if(p.livingIdentityEnabled){
      ensureLivingIdentity(p);
      updateLivingCurrentState(p,{mood});
      if(classifiedEvent)recordClassifiedLivingEvent(p,text,classifiedEvent);
      livingIdentity=livingContext(p);
    }
    ensureWorldPerson(p.personId,p.name,p.personality?.directness||"calme");
    const worldKnowledge=socialContext(p.personId);
    const photoContext=referencedSentVisualContext(p,text)||lastSentVisualContext(p);
    let reply=null,visuals=[],media=[];
    if(isVisualRequest(text)&&!isVisualReferenceOnly(text)){
      const d=visualDecision(p,mood,text);
      const rawVisualRequest=visualRequestContext(text);
      const hasExplicitScene=Object.keys(rawVisualRequest).length>0;
      const scene=hasExplicitScene?resolveVisualScene(p,rawVisualRequest):{allowed:true,request:{...rawVisualRequest}};
      const requestVisual=scene.request;
      const desiredCount=!/\bphotos\b/i.test(text)?1:d.count;
      reply=scene.allowed?d.text:scene.reason;
      if(d.accept&&scene.allowed){
        const selected=selectAvailableVisuals(p,mood,desiredCount,requestVisual);
        const ready=selected.length&&!requestVisual.place?selected.filter(v=>v.place===selected[0].place):selected;
        for(const v of ready){
          media.push({kind:"image",status:"ready",url:v.url,alt:`Photo de ${p.name}`,visualId:v.id,meta:{personId:p.personId,mood:v.mood,place:v.place,outfit:v.outfit,view:v.view,activity:v.activity,moment:v.moment}});
          noteVisualScene(p,v.place);
        }

        let missing=Math.max(0,desiredCount-ready.length);
        const alreadyGenerating=hasPendingLocalImage(p.personId);
        if(missing>0&&!hasExplicitScene&&alreadyGenerating){
          reply="Je t’en prépare déjà une 😏. Elle apparaîtra ici dès qu’elle sera prête.";
          missing=0;
        }
        if(missing>0&&!hasExplicitScene&&!alreadyGenerating){
          const canonicalVisual=getCanonicalVisual(p);
          if(canonicalVisual&&!media.some(item=>item.url===canonicalVisual.url)){
            media.push({
              kind:"image",
              status:"ready",
              url:canonicalVisual.url,
              alt:`Photo de ${p.name}`,
              visualId:canonicalVisual.slot_id,
              meta:{
                personId:p.personId,
                canonical:true,
                view:rawVisualRequest.view||null
              }
            });
            missing--;
          }
        }
        if(missing>0){
          let provider=await currentImageStatus();
          let runtimeResult=null;
          if(LOCAL_ONLY&&!provider.configured&&localImageRuntimeInstalled()){
            runtimeResult=await ensureLocalImageRuntime();
            provider=await imageProviderStatus();
          }
          let slots=selectGenerationSlots(p,mood,Math.min(missing,2),requestVisual);
          if(slots.length&&!requestVisual.place){
            requestVisual.place=slots[0].place;
            slots=selectGenerationSlots(p,mood,Math.min(missing,2),requestVisual);
          }
          const canonicalVisual=getCanonicalVisual(p);
          if(LOCAL_ONLY){
            if(!canonicalVisual){
              if(ready.length===0)reply="Il me manque encore ma photo de référence. Choisis-la dans « Photo canonique » et je pourrai t’envoyer une image qui me ressemble vraiment.";
              const slot=slots[0];
              if(slot&&ready.length===0)media.push({
                kind:"image",status:"error",url:null,
                alt:"Photo de référence manquante : choisis d’abord la photo canonique de ce personnage.",
                visualId:slot.id,
                meta:{personId:p.personId,localOnly:true,failure:"canonical_visual_required",requestVisual}
              });
            }else if(provider.configured){
              for(const slot of slots){
                const prompt=buildVisualPrompt(p,slot,requestVisual);
                media.push({
                  kind:"image",
                  status:"pending",
                  url:null,
                  alt:`Génération d’une photo de ${p.name}…`,
                  visualId:slot.id,
                  meta:{
                    personId:p.personId,
                    localOnly:true,
                    localProvider:provider.provider||"local",
                    imageProvider:provider.provider||"local",
                    startedAt:Date.now(),
                    prompt,
                    referencePath:canonicalVisual.file_path,
                    requestVisual:{...requestVisual},
                    slot:{...slot}
                  }
                });
              }
            }else if(ready.length===0){
              const slot=slots[0];
              if(slot)media.push({
                kind:"image",status:"error",url:null,
                alt:"Le fournisseur d’images est indisponible.",
                visualId:slot.id,
                meta:{personId:p.personId,localOnly:true,imageProvider:provider.provider||"none",failure:provider.error||runtimeResult?.error||"provider_unavailable",requestVisual}
              });
            }
          }else{
            for(const slot of slots){
              media.push({
                kind:"image",status:"pending",url:null,
                alt:`Génération d’une photo de ${p.name}…`,
                visualId:slot.id,
                meta:{personId:p.personId,clientProvider:"puter",prompt:buildVisualPrompt(p,slot,requestVisual),requestVisual:{...requestVisual},mood:slot.mood,place:slot.place,outfit:slot.outfit,view:slot.view,activity:slot.activity,moment:slot.moment}
              });
            }
          }
        }
      }
      visuals=media;
    }else{
      reply=deterministicReply(p,mood,lifestyle,text,preferenceContext("partner",18));
      if(!reply){
        if(!LOCAL_ONLY&&Boolean(b.useClientModel)){
          const pendingId=crypto.randomUUID();
          createPendingChat(pendingId,text);
          const generation=buildCloudMessages({
            profile:p,
            mood,
            messages:previous,
            memories:memoryContext(12),
            userText:text,
            emotional:emotionalOverlay(),
            absence,
            partnerPreferences:preferenceContext("partner",12),
            userPreferences:preferenceContext("user",10),
            lifestyle,
            worldKnowledge,
            photoContext,
            livingIdentity
          });
          return json(res,202,{
            needsClientModel:true,
            pendingId,
            generation:{model:"gemini-3.1-flash-lite",messages:generation},
            state:await state()
          });
        }
        if(LOCAL_ONLY){
          try{reply=await chatWithModel({profile:p,mood,messages:previous,memories:memoryContext(10),userText:text,emotional:emotionalOverlay(),absence,partnerPreferences:preferenceContext("partner",10),userPreferences:preferenceContext("user",8),lifestyle,worldKnowledge,photoContext,livingIdentity})}
          catch(e){console.error("LLM:",e.message)}
          reply=sanitizeModelReply(reply,p,text)||fallbackReply(p,mood,text);
        }else{
          reply=fallbackReply(p,mood,text);
        }
      }
    }

    const partnerMessageId=addMessage("partner",reply);
    const queuedLocalMedia=[];
    for(const item of media){
      const mediaId=addMessageMedia(partnerMessageId,item);
      if(item.status==="pending"&&item.meta?.localProvider&&item.meta?.slot&&item.meta?.prompt&&item.meta?.referencePath){
        queuedLocalMedia.push({mediaId,item});
      }
    }
    for(const queued of queuedLocalMedia){
      enqueueLocalMediaGeneration({
        personId:p.personId,
        mediaId:queued.mediaId,
        profile:JSON.parse(JSON.stringify(p)),
        slot:queued.item.meta.slot,
        prompt:queued.item.meta.prompt,
        referencePath:queued.item.meta.referencePath,
        requestVisual:queued.item.meta.requestVisual||{}
      });
    }
    const learnedPreference=learnPartnerPreferenceFromReply(reply);
    if(p.livingIdentityEnabled&&learnedPreference)syncLivingPreference(p,learnedPreference,reply);
    decayEmotions();
    return json(res,200,{reply,visuals,state:await state()});
  }
  if(req.method==="POST"&&url.pathname==="/api/chat/complete"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),pendingId=String(b.pendingId||"");
    const pending=getPendingChat(pendingId);
    if(!pending)return json(res,404,{error:"pending_chat_not_found"});

    const mood=dailyMood(p);
    let reply=sanitizeModelReply(String(b.reply||""),p,pending.user_text);
    if(!reply)reply=fallbackReply(p,mood,pending.user_text);

    addMessage("partner",reply);
    const learnedPreference=learnPartnerPreferenceFromReply(reply);
    if(p.livingIdentityEnabled&&learnedPreference)syncLivingPreference(p,learnedPreference,reply);
    decayEmotions();
    deletePendingChat(pendingId);
    return json(res,200,{reply,state:await state()});
  }
  if(req.method==="POST"&&url.pathname==="/api/media/complete"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),mediaId=Number(b.mediaId),src=String(b.imageSrc||"");
    const media=getMessageMedia(mediaId);
    if(!media)return json(res,404,{error:"media_not_found"});
    const meta=media.meta?JSON.parse(media.meta):{};
    if(meta.personId&&meta.personId!==p.personId)return json(res,409,{error:"media_owner_mismatch"});
    if(media.status==="ready"&&media.url)return json(res,200,{ok:true,alreadyReady:true,state:await state()});
    if(media.status!=="pending"&&media.url)return json(res,200,{ok:true,alreadyReady:true,state:await state()});
    if(media.status!=="pending")return json(res,409,{error:"media_not_pending"});
    const slotId=media.visual_id||meta.slotId;
    if(!slotId)return json(res,400,{error:"visual_slot_missing"});
    try{
      const imported=await importImageSource(src,slotId);
      const canonical=false;
      const saved=saveCharacterVisual(p,slotId,imported.filePath,imported.mimeType,{canonical:false});
      noteVisualScene(p,meta.place);
      const publicUrl="/"+String(saved.file_path).replace(/^\/+/, "");
      updateMessageMedia(mediaId,{
        url:publicUrl,
        status:"ready",
        alt:`Photo de ${p.name}`,
        visualId:slotId,
        meta:{...meta,completedAt:Date.now(),canonical}
      });
      return json(res,200,{ok:true,state:await state()});
    }catch(e){
      console.error("MEDIA COMPLETE:",e.message);
      updateMessageMedia(mediaId,{status:"error",alt:"La génération de l’image a échoué.",meta:{...meta,error:e.message}});
      return json(res,500,{error:"media_import_failed",message:e.message,state:await state()});
    }
  }
  if(req.method==="POST"&&url.pathname==="/api/media/fail"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),mediaId=Number(b.mediaId);
    const media=getMessageMedia(mediaId);if(!media)return json(res,404,{error:"media_not_found"});
    const meta=media.meta?JSON.parse(media.meta):{};
    if(meta.personId&&meta.personId!==p.personId)return json(res,409,{error:"media_owner_mismatch"});
    if(media.url)return json(res,200,{ok:true,alreadyReady:true,state:await state()});
    const error=String(b.error||"client_generation_failed");
    const noCredits=/no credits|credits remaining|add credits|insufficient credits/i.test(error);
    if(noCredits)setSetting("imageCreditsBlockedUntil",Date.now()+24*60*60*1000);
    updateMessageMedia(mediaId,{
      status:"error",
      alt:noCredits?"Je n’arrive pas à générer une nouvelle photo pour le moment.":"La génération de la photo a échoué.",
      meta:{...meta,error,noCredits}
    });
    return json(res,200,{ok:true,state:await state()});
  }
  if(req.method==="POST"&&url.pathname==="/api/life/tick"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const experience=runLifeTick(p,dailyMood(p));
    return json(res,200,{experience,state:await state()});
  }
  if(req.method==="POST"&&url.pathname==="/api/initiative"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const mood=dailyMood(p);
    const lifestyle=lifeContext(p,mood);
    if(lifestyle.routine.availability==="indisponible"||lifestyle.routine.attention<25)return json(res,200,{initiative:null,reason:"busy_or_asleep",state:await state()});
    const story=pendingExperienceStory();
    if(story&&!story.told&&mood.social>=45){
      const lead=story.outcome==="positif"
        ?`J’ai découvert un truc autour de ${story.topic} et… ça m’a plutôt plu 😄. ${story.note}`
        :story.outcome==="négatif"
          ?`Bon, petite découverte du jour : ${story.topic}, c’est pas vraiment gagné 😂. ${story.note}`
          :`J’ai testé un peu ${story.topic}. Je sais pas encore trop quoi en penser. ${story.note}`;
      markExperienceTold();
      addMessage("partner",lead);
      return json(res,200,{initiative:lead,kind:"experience",state:await state()});
    }
    const decision=initiativeDecision(p,mood);
    if(!decision.should)return json(res,200,{initiative:null,reason:decision.reason,state:await state()});
    const prompts={attention:"J’avais juste envie de venir te parler un peu.",photo:"J’ai peut-être une photo à te montrer… enfin, si j’en ai envie 😏",question:"J’ai une question qui me trotte dans la tête : qu’est-ce qui te rend vraiment heureux dans une relation ?",idea:"J’ai pensé à un truc qu’on pourrait faire différemment.",humor:"Bon, j’ai une blague. Je décline toute responsabilité si elle est nulle 😂",clarify:"J’ai repensé à un truc entre nous et j’aimerais qu’on le clarifie.",distance:"Je suis encore un peu dans ma tête aujourd’hui. Rien de dramatique, mais j’ai besoin de calme."};
    const initiative=prompts[decision.kind]||"J’avais envie de te dire quelque chose.";
    addMessage("partner",initiative);
    return json(res,200,{initiative,kind:decision.kind,state:await state()});
  }
  return false;
}

const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg"};
function staticFile(req,res,url){
  let rel=url.pathname==="/"?"index.html":url.pathname.slice(1);
  if(rel.startsWith("library/")&&!apiAuthorized(req)){
    res.writeHead(401,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"});
    res.end("Unauthorized");
    return true;
  }
  rel=path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/,"");
  const f=path.join(root,rel);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return false;
  res.writeHead(200,{"content-type":types[path.extname(f).toLowerCase()]||"application/octet-stream","cache-control":"no-store"});
  fs.createReadStream(f).pipe(res);return true;
}

http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
    if(url.pathname.startsWith("/api/")){
      if(url.pathname!=="/api/health"&&url.pathname!=="/api/pair"&&!apiAuthorized(req))return json(res,401,{error:"unauthorized"});
      const handled=await api(req,res,url);
      if(handled!==false)return;
      return json(res,404,{error:"not_found"});
    }
    if(staticFile(req,res,url))return;
    res.writeHead(404);res.end("Not found");
  }catch(e){
    console.error(e);
    json(res,500,{error:"server_error",message:e.message});
  }
}).listen(port,()=>{
  console.log(`Human Partner running on http://localhost:${port} (${LOCAL_ONLY?"local":"cloud"})`);
  if(LOCAL_ONLY){
    startRemoteTunnel(port);
    warmModel().then(ok=>console.log(`LLM warmup: ${ok?"ready":"skipped"}`)).catch(e=>console.error("LLM warmup:",e.message));
  }
});
