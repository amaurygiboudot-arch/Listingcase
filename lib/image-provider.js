import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const comfyBase=(process.env.COMFYUI_BASE_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const workflowFile=(process.env.COMFYUI_WORKFLOW_FILE||"").trim();
const comfyInputDir=(process.env.COMFYUI_INPUT_DIR||"").trim();

export async function imageProviderStatus(){
  try{
    const r=await fetch(`${comfyBase}/system_stats`,{signal:AbortSignal.timeout(2500)});
    if(!r.ok)throw new Error(`http_${r.status}`);
    const data=await r.json();
    const workflowConfigured=Boolean(workflowFile&&fs.existsSync(workflowFile));
    return{
      configured:workflowConfigured,
      provider:"comfyui-local",
      local:true,
      baseUrl:comfyBase,
      workflowConfigured,
      system:data.system||null,
      devices:data.devices||[]
    };
  }catch(e){
    return{configured:false,provider:"none",local:true,baseUrl:comfyBase,workflowConfigured:Boolean(workflowFile&&fs.existsSync(workflowFile)),error:e.message};
  }
}

export function buildVisualPrompt(profile,slot,visualState={}){
  const v=profile.visualIdentity||{};
  const identity=[
    "same adult person",
    `identity id ${profile.personId||profile.seed}`,
    `gender ${profile.type}`,
    `visual origin ${profile.origin}`,
    v.eyeColor&&`${v.eyeColor} eyes`,
    v.hairColor&&`${v.hairColor} hair`,
    v.hair&&`${v.hair} hairstyle`,
    v.height&&`${v.height}`,
    v.build&&`${v.build} build`
  ].filter(Boolean).join(", ");
  const continuity=[
    visualState.hair&&`hairstyle ${visualState.hair}`,
    visualState.outfit&&`outfit ${visualState.outfit}`,
    visualState.place&&`location ${visualState.place}`
  ].filter(Boolean).join(", ");
  return [
    "photorealistic candid smartphone photo of the exact same adult person",
    identity,
    `framing ${slot.view||"threequarter"}`,
    `mood ${slot.mood}`,
    `location ${slot.place}`,
    `time ${slot.moment}`,
    `weather ${slot.weather}`,
    `outfit ${slot.outfit}`,
    `hair ${slot.hair}`,
    `activity ${slot.activity}`,
    continuity&&`visual continuity: ${continuity}`,
    "consistent face identity, natural light, realistic anatomy, candid smartphone photo"
  ].filter(Boolean).join(", ");
}

async function saveBytes(buffer,slotId,mime="image/png"){
  const ext=mime.includes("webp")?"webp":mime.includes("jpeg")||mime.includes("jpg")?"jpg":"png";
  const dir=path.resolve("library");
  fs.mkdirSync(dir,{recursive:true});
  const file=`${slotId}-${crypto.randomUUID().slice(0,8)}.${ext}`;
  const abs=path.join(dir,file);
  fs.writeFileSync(abs,buffer);
  return{filePath:`library/${file}`,mimeType:mime};
}

async function saveRemote(url,slotId){
  const r=await fetch(url,{signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw new Error(`image_download_${r.status}`);
  const mime=r.headers.get("content-type")||"image/png";
  const buf=Buffer.from(await r.arrayBuffer());
  return saveBytes(buf,slotId,mime);
}

export async function importImageSource(src,slotId){
  if(!src||typeof src!=="string")throw new Error("image_source_missing");
  if(src.startsWith("data:")){
    const m=src.match(/^data:([^;,]+);base64,(.+)$/s);
    if(!m)throw new Error("invalid_data_uri");
    return saveBytes(Buffer.from(m[2],"base64"),slotId,m[1]||"image/png");
  }
  if(/^https?:\/\//i.test(src))throw new Error("external_image_source_disabled");
  throw new Error("unsupported_image_source");
}

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function replaceWorkflowStrings(value,replacements,state){
  if(Array.isArray(value))return value.map(v=>replaceWorkflowStrings(v,replacements,state));
  if(value&&typeof value==="object"){
    const out={};
    for(const [k,v] of Object.entries(value))out[k]=replaceWorkflowStrings(v,replacements,state);
    return out;
  }
  if(typeof value!=="string")return value;
  let next=value;
  for(const [token,replacement] of Object.entries(replacements)){
    if(next.includes(token)){
      state.used.add(token);
      next=next.split(token).join(replacement||"");
    }
  }
  return next;
}

function prepareReference(referencePath){
  if(!referencePath||!comfyInputDir)return "";
  const source=path.resolve(referencePath);
  if(!fs.existsSync(source))return "";
  fs.mkdirSync(comfyInputDir,{recursive:true});
  const ext=path.extname(source)||".png";
  const name=`human-partner-${crypto.createHash("sha1").update(source).digest("hex").slice(0,12)}${ext}`;
  const target=path.join(comfyInputDir,name);
  if(!fs.existsSync(target))fs.copyFileSync(source,target);
  return name;
}

function buildWorkflow(prompt,referencePath){
  if(!workflowFile||!fs.existsSync(workflowFile))throw new Error("comfyui_workflow_missing");
  const raw=JSON.parse(fs.readFileSync(workflowFile,"utf8"));
  const graph=raw.prompt&&typeof raw.prompt==="object"?raw.prompt:raw;
  const referenceName=prepareReference(referencePath);
  const negative="different person, different face, duplicate person, extra limbs, malformed anatomy, low quality, text, watermark";
  const state={used:new Set()};
  const replaced=replaceWorkflowStrings(graph,{
    "{{PROMPT}}":prompt,
    "{{NEGATIVE_PROMPT}}":negative,
    "{{REFERENCE_IMAGE}}":referenceName
  },state);
  if(!state.used.has("{{PROMPT}}")){
    const textNodes=Object.values(replaced).filter(node=>node&&node.class_type==="CLIPTextEncode"&&node.inputs&&typeof node.inputs.text==="string");
    if(textNodes[0])textNodes[0].inputs.text=prompt;
    if(textNodes[1])textNodes[1].inputs.text=negative;
  }
  return replaced;
}

async function runComfyWorkflow(graph){
  const submit=await fetch(`${comfyBase}/prompt`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({prompt:graph,client_id:crypto.randomUUID()}),
    signal:AbortSignal.timeout(10000)
  });
  if(!submit.ok)throw new Error(`comfy_submit_http_${submit.status}`);
  const data=await submit.json();
  const promptId=data.prompt_id;
  if(!promptId)throw new Error("comfy_prompt_id_missing");
  const deadline=Date.now()+8*60*1000;
  while(Date.now()<deadline){
    await sleep(1500);
    const r=await fetch(`${comfyBase}/history/${encodeURIComponent(promptId)}`,{signal:AbortSignal.timeout(5000)});
    if(!r.ok)continue;
    const history=await r.json();
    const entry=history[promptId]||Object.values(history)[0];
    if(!entry)continue;
    if(entry.status?.status_str==="error")throw new Error("comfy_generation_error");
    for(const output of Object.values(entry.outputs||{})){
      if(output?.images?.length)return output.images[0];
    }
  }
  throw new Error("comfy_generation_timeout");
}

async function downloadComfyImage(image){
  const params=new URLSearchParams({filename:image.filename||"",subfolder:image.subfolder||"",type:image.type||"output"});
  const r=await fetch(`${comfyBase}/view?${params}`,{signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw new Error(`comfy_view_http_${r.status}`);
  return{buffer:Buffer.from(await r.arrayBuffer()),mime:r.headers.get("content-type")||"image/png"};
}

export async function generateVisual(profile,slot,prompt,{referencePath=null}={}){
  const status=await imageProviderStatus();
  if(!status.configured)return null;
  const graph=buildWorkflow(prompt,referencePath);
  const image=await runComfyWorkflow(graph);
  const downloaded=await downloadComfyImage(image);
  return saveBytes(downloaded.buffer,slot.id,downloaded.mime);
}
