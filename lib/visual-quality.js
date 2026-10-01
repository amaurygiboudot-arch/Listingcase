import fs from "node:fs";

const OLLAMA_BASE=(process.env.VISION_BASE_URL||"http://127.0.0.1:11434").replace(/\/$/,"");
const VISION_MODEL=(process.env.VISION_MODEL||"moondream").trim();
const QUALITY_REQUIRED=String(process.env.VISUAL_QUALITY_REQUIRED??"1")!=="0";

const cleanJson=text=>{
  const s=String(text||"").trim().replace(/^\`\`\`(?:json)?/i,"").replace(/\`\`\`$/,"").trim();
  const first=s.indexOf("{"),last=s.lastIndexOf("}");
  if(first<0||last<first)return null;
  try{return JSON.parse(s.slice(first,last+1))}catch{return null}
};

const norm=v=>String(v??"").trim().toLowerCase();

function requestRules(request={}){
  return Object.entries({
    place:request.place,view:request.view,outfit:request.outfit,activity:request.activity
  }).filter(([,v])=>v).map(([k,v])=>`${k}=${v}`).join(", ")||"none";
}

export async function analyzeGeneratedVisual({filePath,profile,requestVisual={}}={}){
  if(!filePath||!fs.existsSync(filePath))return{available:false,approved:false,reason:"image_missing"};
  const image=fs.readFileSync(filePath).toString("base64");
  const prompt=`Inspect this generated image for a photo-quality gate. Return JSON only.
Character: adult ${profile?.type||"person"}. Requested visual constraints: ${requestRules(requestVisual)}.
Judge only what is visibly supported. Do not invent hidden details.
Schema:
{"personCount":1,"imageReadable":true,"blurred":false,"faceDistorted":false,"bodyDistorted":false,
"extraOrMissingLimbs":false,"handsDistorted":false,"handsVisible":true,"sceneMatchesRequest":true,
"observed":{"place":null,"view":null,"outfit":null,"activity":null,"hair":null,"expression":null,"nudity":"clothed"},
"notes":[]}
Use nudity only as one of: clothed, partial, nude, unknown. This is classification, not erotic description.`;
  try{
    const r=await fetch(OLLAMA_BASE+"/api/chat",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({model:VISION_MODEL,stream:false,messages:[{role:"user",content:prompt,images:[image]}],
        options:{temperature:0,num_predict:350}}),
      signal:AbortSignal.timeout(Number(process.env.VISION_TIMEOUT_MS||120000))
    });
    if(!r.ok)return{available:false,approved:!QUALITY_REQUIRED,reason:`vision_http_${r.status}`};
    const data=await r.json();
    const report=cleanJson(data?.message?.content);
    if(!report)return{available:false,approved:!QUALITY_REQUIRED,reason:"vision_invalid_json"};
    const reasons=[];
    if(report.imageReadable===false)reasons.push("image_unreadable");
    if(Number(report.personCount||0)!==1)reasons.push("person_count");
    if(report.blurred===true)reasons.push("blurred");
    if(report.faceDistorted===true)reasons.push("face_distorted");
    if(report.bodyDistorted===true)reasons.push("body_distorted");
    if(report.extraOrMissingLimbs===true)reasons.push("limbs_invalid");
    if(report.handsVisible===true&&report.handsDistorted===true)reasons.push("hands_distorted");
    if(report.sceneMatchesRequest===false)reasons.push("scene_mismatch");

    const observed=report.observed&&typeof report.observed==="object"?report.observed:{};
    const strict=[["place",requestVisual.place],["view",requestVisual.view]];
    for(const [key,wanted] of strict){
      const got=norm(observed[key]);
      if(wanted&&got&&got!=="unknown"&&!got.includes(norm(wanted))&&!norm(wanted).includes(got)){
        reasons.push(`${key}_mismatch`);
      }
    }
    return{
      available:true,
      approved:reasons.length===0,
      reasons,
      report,
      observed,
      model:VISION_MODEL,
      checkedAt:Date.now()
    };
  }catch(e){
    return{available:false,approved:!QUALITY_REQUIRED,reason:String(e?.message||e),model:VISION_MODEL};
  }
}

export function qualityRetryHint(result={}){
  const reasons=Array.isArray(result.reasons)?result.reasons:[];
  if(!reasons.length)return"";
  const map={
    person_count:"exactly one adult person",
    blurred:"sharp focus",
    face_distorted:"natural undistorted face",
    body_distorted:"natural human proportions",
    limbs_invalid:"exactly two arms and two legs, no duplicated or missing limbs",
    hands_distorted:"natural hands with correct fingers",
    scene_mismatch:"follow the requested scene exactly",
    place_mismatch:"use the requested location exactly",
    view_mismatch:"use the requested framing exactly"
  };
  return reasons.map(x=>map[x]||x.replaceAll("_"," ")).join(", ");
}
