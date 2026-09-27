import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSetting,setSetting,getPartner,savePartner,clearPartner,addMessage,recentMessages,addMemory,recentMemories,seedVisualSlots } from "./lib/db.js";
import { createProfile,dailyMood,advanceRelationship,captureMemory,visualDecision } from "./lib/profile.js";
import { chatWithModel,fallbackReply,modelConfigured } from "./lib/model.js";
import { selectVisuals,libraryStats } from "./lib/visual.js";

const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||8787);
seedVisualSlots();

const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(data))};
const body=async req=>{let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{}};
const state=()=>{const partner=getPartner();return{adultConfirmed:getSetting("adultConfirmed",false),partner, mood:partner?dailyMood(partner):null,messages:recentMessages(40),library:libraryStats(),model:{configured:modelConfigured(),baseUrl:process.env.LLM_BASE_URL||null,model:process.env.LLM_MODEL||null}}};

async function api(req,res,url){
  if(req.method==="GET"&&url.pathname==="/api/health")return json(res,200,{ok:true,library:libraryStats(),modelConfigured:modelConfigured()});
  if(req.method==="GET"&&url.pathname==="/api/state")return json(res,200,state());
  if(req.method==="POST"&&url.pathname==="/api/adult"){const b=await body(req);setSetting("adultConfirmed",Boolean(b.confirmed));return json(res,200,state())}
  if(req.method==="POST"&&url.pathname==="/api/partner"){if(!getSetting("adultConfirmed",false))return json(res,403,{error:"adult_confirmation_required"});const b=await body(req),p=createProfile(Array.isArray(b.interests)?b.interests:[]);savePartner(p);addMessage("partner","Salut. On ne se connaît pas encore vraiment, donc je préfère qu’on commence simplement 😄. Qu’est-ce que tu veux savoir sur moi ?");return json(res,201,state())}
  if(req.method==="POST"&&url.pathname==="/api/reset"){clearPartner();return json(res,200,state())}
  if(req.method==="POST"&&url.pathname==="/api/visual/select"){const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});const b=await body(req),m=dailyMood(p),decision=visualDecision(p,m,b.text||"photos"),visuals=decision.accept?selectVisuals(p,m,decision.count):[];return json(res,200,{decision,visuals})}
  if(req.method==="POST"&&url.pathname==="/api/chat"){
    const p=getPartner();if(!p)return json(res,404,{error:"no_partner"});const b=await body(req),text=String(b.text||"").trim();if(!text)return json(res,400,{error:"empty_message"});
    const previous=recentMessages(20);addMessage("user",text);const mem=captureMemory(text);if(mem)addMemory(mem.kind,mem.content,mem.weight);advanceRelationship(p);savePartner(p);const mood=dailyMood(p);
    let reply,visuals=[];if(/photo|photos|image|images/i.test(text)){const d=visualDecision(p,mood,text);reply=d.text;visuals=d.accept?selectVisuals(p,mood,d.count):[]}
    else{try{reply=await chatWithModel({profile:p,mood,messages:previous,memories:recentMemories(16),userText:text})}catch(e){console.error("LLM:",e.message)}reply=reply||fallbackReply(p,mood,text)}
    addMessage("partner",reply);return json(res,200,{reply,visuals,state:state()});
  }
  return false;
}

const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg"};
function staticFile(req,res,url){let rel=url.pathname==="/"?"index.html":url.pathname.slice(1);rel=path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/,"");const f=path.join(root,rel);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return false;res.writeHead(200,{"content-type":types[path.extname(f).toLowerCase()]||"application/octet-stream"});fs.createReadStream(f).pipe(res);return true}

http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);if(url.pathname.startsWith("/api/")){const handled=await api(req,res,url);if(handled!==false)return;return json(res,404,{error:"not_found"})}if(staticFile(req,res,url))return;res.writeHead(404);res.end("Not found")}catch(e){console.error(e);json(res,500,{error:"server_error",message:e.message})}}).listen(port,()=>console.log(`Human Partner running on http://localhost:${port}`));
