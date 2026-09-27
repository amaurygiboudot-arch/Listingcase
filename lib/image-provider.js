import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const comfyBase=(process.env.COMFYUI_BASE_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const imageApi=(process.env.IMAGE_API_URL||"").replace(/\/$/,"");
const imageKey=process.env.IMAGE_API_KEY||"";
const pollinationsKey=process.env.POLLINATIONS_API_KEY||"";

export async function imageProviderStatus(){
  if(pollinationsKey){
    return{configured:true,provider:"pollinations",baseUrl:"https://gen.pollinations.ai"};
  }
  if(imageApi){
    return{configured:true,provider:"http-image-api",baseUrl:imageApi};
  }
  try{
    const r=await fetch(`${comfyBase}/system_stats`,{signal:AbortSignal.timeout(2500)});
    if(!r.ok)throw new Error(`http_${r.status}`);
    const data=await r.json();
    return{
      configured:Boolean(process.env.COMFYUI_WORKFLOW_FILE),
      provider:"comfyui",
      baseUrl:comfyBase,
      workflowConfigured:Boolean(process.env.COMFYUI_WORKFLOW_FILE),
      system:data.system||null,
      devices:data.devices||[]
    };
  }catch(e){
    return{configured:false,provider:"none",baseUrl:null,error:e.message};
  }
}

export function buildVisualPrompt(profile,slot,visualState={}){
  const v=profile.visualIdentity||{};
  const identity=[
    `same adult ${profile.type}`,
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
    "photorealistic portrait of the exact same adult person",
    identity,
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
  if(/^https?:\/\//i.test(src))return saveRemote(src,slotId);
  throw new Error("unsupported_image_source");
}

export async function generateVisual(profile,slot,prompt){
  if(pollinationsKey){
    const url="https://gen.pollinations.ai/image/"+encodeURIComponent(prompt)+"?model=flux&width=768&height=1024";
    const r=await fetch(url,{
      headers:{authorization:`Bearer ${pollinationsKey}`},
      signal:AbortSignal.timeout(180000)
    });
    if(!r.ok)throw new Error(`pollinations_http_${r.status}`);
    const mime=r.headers.get("content-type")||"image/jpeg";
    const buf=Buffer.from(await r.arrayBuffer());
    return saveBytes(buf,slot.id,mime);
  }

  if(imageApi){
    const headers={"content-type":"application/json"};
    if(imageKey)headers.authorization=`Bearer ${imageKey}`;
    const r=await fetch(imageApi,{
      method:"POST",
      headers,
      body:JSON.stringify({
        prompt,
        width:768,
        height:1024,
        character_id:profile.seed,
        slot_id:slot.id
      }),
      signal:AbortSignal.timeout(180000)
    });
    if(!r.ok)throw new Error(`image_api_http_${r.status}`);
    const data=await r.json();
    const url=data.url||data.image_url||data.data?.[0]?.url;
    if(url)return saveRemote(url,slot.id);
    const b64=data.image_base64||data.b64_json||data.data?.[0]?.b64_json;
    if(b64)return saveBytes(Buffer.from(b64,"base64"),slot.id,data.mime_type||"image/png");
    throw new Error("image_api_no_image");
  }

  const workflowFile=process.env.COMFYUI_WORKFLOW_FILE;
  if(workflowFile&&fs.existsSync(workflowFile)){
    throw new Error("comfyui_workflow_adapter_not_configured");
  }

  return null;
}
