import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSetting,setSetting,getPartner,savePartner,clearPartner,addMessage,recentMessages,addMemory,recentMemories,seedVisualSlots } from "./lib/db.js";
import { createProfile,dailyMood,advanceRelationship,visualDecision } from "./lib/profile.js";
import { recordEvent,noteInteraction,absenceState,applyAbsence,emotionalOverlay,decayEmotions,memoryContext,initiativeDecision } from "./lib/memory.js";
import { seedInitialPreferences,learnUserPreference,learnPartnerPreferenceFromReply,preferenceContext } from "./lib/preferences.js";
import { runLifeTick,latestExperiences,pendingExperienceStory,markExperienceTold } from "./lib/experiences.js";
import { chatWithModel,fallbackReply,modelStatus } from "./lib/model.js";
import { selectVisuals,libraryStats } from "./lib/visual.js";
import { imageProviderStatus,buildVisualPrompt } from "./lib/image-provider.js";

const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||8787);
seedVisualSlots();

const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(data))};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}};

async function state(){
  const partner=getPartner();
  const mood=partner?dailyMood(partner):null;
  const life=partner?runLifeTick(partner,mood):null;
  return{
    adultConfirmed:getSetting("adultConfirmed",false),
    partner,
    mood,
    life,
    experiences:latestExperiences(10),
    pendingStory:pendingExperienceStory(),
    messages:recentMessages(40),
    memories:memoryContext(12),
    preferences:{partner:preferenceContext("partner",18),user:preferenceContext("user",18)},
    emotional:emotionalOverlay(),
    absence:partner?absenceState(partner):null,
    library:libraryStats(),
    providers:{
      llm:await modelStatus(),
      image:await imageProviderStatus()
    }
  };
}

async function api(req,res,url){
  if(req.method==="GET"&&url.pathname==="/api/health")return json(res,200,{ok:true,library:libraryStats(),providers:{llm:await modelStatus(),image:await imageProviderStatus()}});
  if(req.method==="GET"&&url.pathname==="/api/providers")return json(res,200,{llm:await modelStatus(),image:await imageProviderStatus()});
  if(req.method==="GET"&&url.pathname==="/api/state")return json(res,200,await state());
  if(req.method==="POST"&&url.pathname==="/api/adult"){const b=await body(req);setSetting("adultConfirmed",Boolean(b.confirmed));return json(res,200,await state())}
  if(req.method==="POST"&&url.pathname==="/api/partner"){
    if(!getSetting("adultConfirmed",false))return json(res,403,{error:"adult_confirmation_required"});
    const b=await body(req),p=createProfile(Array.isArray(b.interests)?b.interests:[]);
    savePartner(p);
    seedInitialPreferences(p);
    noteInteraction();
    addMessage("partner","Salut. On ne se connaît pas encore vraiment, donc je préfère qu’on commence simplement 😄. Qu’est-ce que tu veux savoir sur moi ?");
    return json(res,201,await state());
  }
  if(req.method==="POST"&&url.pathname==="/api/reset"){clearPartner();return json(res,200,await state())}
  if(req.method==="POST"&&url.pathname==="/api/visual/select"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),m=dailyMood(p),decision=visualDecision(p,m,b.text||"photos");
    const visuals=decision.accept?selectVisuals(p,m,decision.count):[];
    const imageStatus=await imageProviderStatus();
    const enriched=visuals.map(v=>({...v,prompt:buildVisualPrompt(p,v,{})}));
    return json(res,200,{decision,visuals:enriched,imageProvider:imageStatus});
  }
  if(req.method==="POST"&&url.pathname==="/api/chat"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const b=await body(req),text=String(b.text||"").trim();if(!text)return json(res,400,{error:"empty_message"});
    const previous=recentMessages(20);
    const absence=applyAbsence(p);
    noteInteraction();
    addMessage("user",text);
    recordEvent(text);
    learnUserPreference(text);
    advanceRelationship(p);savePartner(p);const mood=dailyMood(p);
    let reply,visuals=[];
    if(/photo|photos|image|images/i.test(text)){
      const d=visualDecision(p,mood,text);
      reply=d.text;
      visuals=d.accept?selectVisuals(p,mood,d.count).map(v=>({...v,prompt:buildVisualPrompt(p,v,{})})):[];
    }else{
      try{reply=await chatWithModel({profile:p,mood,messages:previous,memories:memoryContext(16),userText:text,emotional:emotionalOverlay(),absence,partnerPreferences:preferenceContext("partner",18),userPreferences:preferenceContext("user",18)})}
      catch(e){console.error("LLM:",e.message)}
      reply=reply||fallbackReply(p,mood,text);
    }
    addMessage("partner",reply);
    learnPartnerPreferenceFromReply(reply);
    decayEmotions();
    return json(res,200,{reply,visuals,state:await state()});
  }
  if(req.method==="POST"&&url.pathname==="/api/life/tick"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const experience=runLifeTick(p,dailyMood(p));
    return json(res,200,{experience,state:await state()});
  }
  if(req.method==="POST"&&url.pathname==="/api/initiative"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});
    const mood=dailyMood(p);
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
  rel=path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/,"");
  const f=path.join(root,rel);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return false;
  res.writeHead(200,{"content-type":types[path.extname(f).toLowerCase()]||"application/octet-stream"});
  fs.createReadStream(f).pipe(res);return true;
}

http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
    if(url.pathname.startsWith("/api/")){
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
}).listen(port,()=>console.log(`Human Partner running on http://localhost:${port}`));
