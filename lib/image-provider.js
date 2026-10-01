import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureSdCppServer,keepSdCppServerWarm,sdCppServerStatus } from "./sdcpp-server-runtime.js";

const execFileAsync=promisify(execFile);

const comfyBase=(process.env.COMFYUI_BASE_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const preferredImageProvider=(process.env.IMAGE_PROVIDER||"auto").trim().toLowerCase();
const builtInWorkflow=path.resolve("config","comfyui-tiny-sd.json");
const workflowFile=(process.env.COMFYUI_WORKFLOW_FILE||"").trim()||(fs.existsSync(builtInWorkflow)?builtInWorkflow:"");
const comfyInputDir=(process.env.COMFYUI_INPUT_DIR||"C:\\AI\\ComfyUI_windows_portable\\ComfyUI\\input").trim();
const sdCppBin=(process.env.SDCPP_BIN||path.resolve("..","human-partner-image","sd","sd-cli.exe")).trim();
const sdCppServerBin=(process.env.SDCPP_SERVER_BIN||path.join(path.dirname(sdCppBin),"sd-server.exe")).trim();
const sdCppServerBackend=(process.env.SDCPP_SERVER_BACKEND||"diffusion=Vulkan0,clip=CPU,vae=CPU").trim();
const preferredSdCppModel=path.resolve("..","human-partner-image","models","dreamshaper-7-lcm-q4_0.gguf");
const fallbackDreamShaperModel=path.resolve("C:\\AI\\ComfyUI_windows_portable","ComfyUI","models","checkpoints","DreamShaper_8_pruned.safetensors");
const fallbackTinySdModel=path.resolve("C:\\AI\\ComfyUI_windows_portable","ComfyUI","models","checkpoints","segmind_tiny-sd.safetensors");
const configuredSdCppModel=(process.env.SDCPP_MODEL||"").trim();
const sdCppModel=configuredSdCppModel||(fs.existsSync(preferredSdCppModel)?preferredSdCppModel:(fs.existsSync(fallbackDreamShaperModel)?fallbackDreamShaperModel:(fs.existsSync(fallbackTinySdModel)?fallbackTinySdModel:preferredSdCppModel)));
const sdCppClipVision=(process.env.SDCPP_CLIP_VISION||path.resolve("..","human-partner-image","identity","clip_vision_h.safetensors")).trim();
const sdCppIpAdapter=(process.env.SDCPP_IP_ADAPTER||path.resolve("..","human-partner-image","identity","ip-adapter-plus-face_sd15.safetensors")).trim();
const sdCppIpAdapterStrength=Number(process.env.SDCPP_IP_ADAPTER_STRENGTH||0.85);
const sdCppUseIpAdapter=String(process.env.SDCPP_USE_IP_ADAPTER||"0")!=="0";
const sdCppImg2ImgStrength=Number(process.env.SDCPP_IMG2IMG_STRENGTH||0.28);
const sdCppThreads=Number(process.env.SDCPP_THREADS||4);
const sdCppBackend=(process.env.SDCPP_BACKEND||"cpu").trim();
const knownSdCppModelSizes=new Map([
  ["dreamshaper-7-lcm-q4_0.gguf",1625041920],
  ["segmind_tiny-sd.safetensors",1060307606]
]);

export function expectedSdCppModelSize(modelPath){
  return knownSdCppModelSizes.get(path.basename(String(modelPath||"")).toLowerCase())||null;
}

export function validSdCppModelSize(modelPath,size){
  const expected=expectedSdCppModelSize(modelPath);
  return expected?Number(size)===expected:Number(size)>1500000000;
}

function inspectSdCpp(){
  const executable=fs.existsSync(sdCppBin);
  const modelExists=fs.existsSync(sdCppModel);
  const actualSize=modelExists?fs.statSync(sdCppModel).size:0;
  const expectedSize=expectedSdCppModelSize(sdCppModel);
  return{
    executable,modelExists,actualSize,expectedSize,
    valid:executable&&modelExists&&validSdCppModelSize(sdCppModel,actualSize)
  };
}

const sdCppEnabled=()=>inspectSdCpp().valid;

export function sdCppGenerationPreset(modelPath=sdCppModel){
  const name=path.basename(String(modelPath||"")).toLowerCase();
  if(name==="dreamshaper-7-lcm-q4_0.gguf")return{sampling:"lcm",scheduler:"lcm",steps:4,cfg:1.5};
  if(name==="dreamshaper_8_pruned.safetensors")return{sampling:"euler",scheduler:null,steps:4,cfg:5.0};
  return{sampling:"euler",scheduler:null,steps:6,cfg:5.0};
}

export function validIdentityAdapterSizes(clipVisionSize,ipAdapterSize){
  return Number(clipVisionSize)>1200000000&&Number(ipAdapterSize)>90000000;
}

function inspectIdentityAdapter(){
  const clipVisionExists=fs.existsSync(sdCppClipVision);
  const ipAdapterExists=fs.existsSync(sdCppIpAdapter);
  const clipVisionSize=clipVisionExists?fs.statSync(sdCppClipVision).size:0;
  const ipAdapterSize=ipAdapterExists?fs.statSync(sdCppIpAdapter).size:0;
  return{
    configured:sdCppUseIpAdapter&&clipVisionExists&&ipAdapterExists&&validIdentityAdapterSizes(clipVisionSize,ipAdapterSize),
    mode:"ip-adapter-plus-face",
    clipVision:sdCppClipVision,
    ipAdapter:sdCppIpAdapter,
    clipVisionSize,
    ipAdapterSize,
    strength:sdCppIpAdapterStrength
  };
}

export async function imageProviderStatus(){
  const sd=inspectSdCpp();

  // Human Partner now prefers ComfyUI by default. This is important because a
  // valid Tiny-SD fallback must not prevent the ComfyUI runtime from starting.
  if(preferredImageProvider==="comfyui"){
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
      return{
        configured:false,
        provider:"comfyui-local",
        local:true,
        baseUrl:comfyBase,
        workflowConfigured:Boolean(workflowFile&&fs.existsSync(workflowFile)),
        fallbackSdCppAvailable:sd.valid,
        error:e.message
      };
    }
  }

  if(sd.valid){
    return{
      configured:true,
      provider:"stable-diffusion.cpp-local",
      local:true,
      mode:sdCppBackend&&sdCppBackend.toLowerCase()!=="auto"?`on-demand-${sdCppBackend}`:"on-demand-auto-fit",
      executable:sdCppBin,
      model:sdCppModel,
      modelSizeBytes:sd.actualSize,
      expectedModelSizeBytes:sd.expectedSize,
      identity:inspectIdentityAdapter()
    };
  }

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
    slot.pose&&`pose ${slot.pose}`,
    slot.focus&&`visual focus ${slot.focus}`,
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
  const dir=path.resolve(process.env.LIBRARY_DIR||"library");
  fs.mkdirSync(dir,{recursive:true});
  const file=`${slotId}-${crypto.randomUUID().slice(0,8)}.${ext}`;
  const abs=path.join(dir,file);
  fs.writeFileSync(abs,buffer);
  return{filePath:`library/${file}`,mimeType:mime};
}

async function unloadOllamaForImage(){
  try{
    await fetch("http://127.0.0.1:11434/api/generate",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({model:"qwen3:1.7b",keep_alive:0}),
      signal:AbortSignal.timeout(8000)
    });
  }catch{}
}

function warmOllamaAfterImage(){
  fetch("http://127.0.0.1:11434/api/chat",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      model:"qwen3:1.7b",
      messages:[{role:"user",content:"OK"}],
      stream:false,
      think:false,
      keep_alive:"24h",
      options:{num_gpu:0,num_ctx:1536,num_predict:1,temperature:0.1}
    })
  }).catch(()=>{});
}

function imageSizeForRequest(requestVisual={}){
  const explicit=Boolean(requestVisual?.pose||requestVisual?.focus||requestVisual?.place||requestVisual?.outfit||requestVisual?.activity);
  const width=Math.max(160,Number(explicit?(process.env.SDCPP_DETAILED_WIDTH||256):(process.env.SDCPP_FAST_WIDTH||192)));
  const height=Math.max(256,Number(explicit?(process.env.SDCPP_DETAILED_HEIGHT||384):(process.env.SDCPP_FAST_HEIGHT||320)));
  return{width,height};
}

function stepsForRequest(requestVisual={},presetSteps=4){
  const explicit=Boolean(requestVisual?.pose||requestVisual?.focus||requestVisual?.place||requestVisual?.outfit||requestVisual?.activity);
  const envFast=Number(process.env.SDCPP_FAST_STEPS||2);
  const envDetailed=Number(process.env.SDCPP_DETAILED_STEPS||6);
  return Math.max(1,Math.min(8,explicit?envDetailed:Math.min(envFast,presetSteps)));
}

function imageStrengthForRequest(requestVisual={}){
  if(Number.isFinite(Number(process.env.SDCPP_IMG2IMG_STRENGTH_OVERRIDE))){
    return Math.max(0.05,Math.min(0.8,Number(process.env.SDCPP_IMG2IMG_STRENGTH_OVERRIDE)));
  }
  if(requestVisual?.pose||requestVisual?.focus)return 0.28;
  if(requestVisual?.place||requestVisual?.outfit||requestVisual?.activity||requestVisual?.moment)return 0.20;
  return 0.15;
}

async function generateWithSdServer(slot,prompt,referencePath,requestVisual={}){
  if(!fs.existsSync(sdCppServerBin)||!fs.existsSync(referencePath))return null;
  if(path.basename(sdCppModel).toLowerCase()!=="dreamshaper-7-lcm-q4_0.gguf")return null;
  const server=await ensureSdCppServer({
    bin:sdCppServerBin,
    model:sdCppModel,
    threads:sdCppThreads,
    backend:sdCppServerBackend
  });
  const {width,height}=imageSizeForRequest(requestVisual);
  const init=fs.readFileSync(referencePath).toString("base64");
  const negative="different person, different face, duplicate person, duplicate body, extra arms, extra legs, extra limbs, missing limbs, malformed anatomy, distorted body, malformed face, asymmetrical eyes, crossed eyes, bad hands, malformed hands, fused fingers, extra fingers, missing fingers, low quality, text, watermark, blurry";
  const strength=imageStrengthForRequest(requestVisual);
  const started=Date.now();
  const r=await fetch(server.url+"/sdapi/v1/img2img",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      prompt,negative_prompt:negative,width,height,steps:stepsForRequest(requestVisual,4),cfg_scale:1.5,seed:-1,
      sampler_name:"lcm",scheduler:"lcm",init_images:[init],denoising_strength:strength
    }),
    signal:AbortSignal.timeout(15*60*1000)
  });
  if(!r.ok)throw new Error(`sdcpp_server_http_${r.status}`);
  const data=await r.json();
  if(!data?.images?.[0])throw new Error("sdcpp_server_output_missing");
  const buffer=Buffer.from(data.images[0],"base64");
  keepSdCppServerWarm(Number(process.env.SDCPP_SERVER_WARM_MS||10*60*1000));
  console.log(`SDCPP server image ${slot.id}: ${((Date.now()-started)/1000).toFixed(1)}s • ${width}x${height} • strength ${strength}`);
  return saveBytes(buffer,slot.id,"image/png");
}

async function generateWithSdCpp(profile,slot,prompt,referencePath=null,requestVisual={}){
  await unloadOllamaForImage();
  const resolvedReference=referencePath?path.resolve(referencePath):null;
  if(resolvedReference&&fs.existsSync(resolvedReference)){
    try{
      const served=await generateWithSdServer(slot,prompt,resolvedReference,requestVisual);
      if(served)return served;
    }catch(e){
      console.warn("SDCPP server:",e.message);
      const lcmModel=path.basename(sdCppModel).toLowerCase()==="dreamshaper-7-lcm-q4_0.gguf";
      const allowSlowFallback=String(process.env.SDCPP_ALLOW_SLOW_FALLBACK||"0")==="1";
      if(lcmModel&&!allowSlowFallback)throw e;
    }
  }
  const jobsDir=path.resolve("data","image-jobs");
  fs.mkdirSync(jobsDir,{recursive:true});
  const outFile=path.join(jobsDir,`${slot.id}-${crypto.randomUUID().slice(0,8)}.png`);
  const {width,height}=imageSizeForRequest(requestVisual);
  const negative="different person, different face, duplicate person, duplicate body, extra arms, extra legs, extra limbs, missing limbs, malformed anatomy, distorted body, malformed face, asymmetrical eyes, crossed eyes, bad hands, malformed hands, fused fingers, extra fingers, missing fingers, low quality, text, watermark, blurry";
  const preset=sdCppGenerationPreset(sdCppModel);
  const steps=Number(process.env.SDCPP_STEPS||stepsForRequest(requestVisual,preset.steps));
  const cfg=Number(process.env.SDCPP_CFG_SCALE||preset.cfg);
  const args=[
    "-M","img_gen",
    "-m",sdCppModel,
    "-p",prompt,
    "-n",negative,
    "--mmap",
    "--log-level","warn",
    "--threads",String(sdCppThreads),
    "--sampling-method",preset.sampling,
    "--steps",String(steps),
    "--cfg-scale",String(cfg),
    "-W",String(width),
    "-H",String(height),
    "-s","-1",
    "-o",outFile
  ];
  if(width*height>=512*512)args.push("--vae-tiling");
  if(preset.scheduler)args.push("--scheduler",preset.scheduler);
  if(sdCppBackend&&sdCppBackend.toLowerCase()!=="auto")args.push("--backend",sdCppBackend);
  if(referencePath&&fs.existsSync(path.resolve(referencePath))){
    const reference=path.resolve(referencePath);
    const identity=inspectIdentityAdapter();
    if(identity.configured){
      args.push(
        "--clip_vision",identity.clipVision,
        "--ip-adapter",identity.ipAdapter,
        "--ip-adapter-image",reference,
        "--ip-adapter-strength",String(identity.strength)
      );
    }else{
      args.push("-i",reference,"--strength",String(imageStrengthForRequest(requestVisual)));
    }
  }
  const startedAt=Date.now();
  try{
    await execFileAsync(sdCppBin,args,{windowsHide:true,timeout:30*60*1000,maxBuffer:16*1024*1024});
    console.log(`SDCPP image ${slot.id}: ${((Date.now()-startedAt)/1000).toFixed(1)}s • ${width}x${height} • ${path.basename(sdCppModel)} • ${steps} steps`);
    if(!fs.existsSync(outFile))throw new Error("sdcpp_output_missing");
    const buffer=fs.readFileSync(outFile);
    const saved=await saveBytes(buffer,slot.id,"image/png");
    return saved;
  }finally{
    try{fs.rmSync(outFile,{force:true})}catch{}
  }
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
    signal:AbortSignal.timeout(120000)
  });
  if(!submit.ok)throw new Error(`comfy_submit_http_${submit.status}`);
  const data=await submit.json();
  const promptId=data.prompt_id;
  if(!promptId)throw new Error("comfy_prompt_id_missing");
  const deadline=Date.now()+20*60*1000;
  while(Date.now()<deadline){
    await sleep(2000);
    let r;
    try{
      r=await fetch(`${comfyBase}/history/${encodeURIComponent(promptId)}`,{signal:AbortSignal.timeout(60000)});
    }catch{
      continue;
    }
    if(!r.ok)continue;
    const history=await r.json();
    const entry=history[promptId]||Object.values(history)[0];
    if(!entry)continue;
    if(entry.status?.status_str==="error"){
      const messages=entry.status?.messages||[];
      const detail=JSON.stringify(messages).slice(0,1200);
      throw new Error(`comfy_generation_error:${detail}`);
    }
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

export async function generateVisual(profile,slot,prompt,{referencePath=null,requestVisual={}}={}){
  const status=await imageProviderStatus();
  if(!status.configured)return null;
  if(status.provider==="stable-diffusion.cpp-local"){
    return generateWithSdCpp(profile,slot,prompt,referencePath,requestVisual);
  }
  const graph=buildWorkflow(prompt,referencePath);
  const image=await runComfyWorkflow(graph);
  const downloaded=await downloadComfyImage(image);
  return saveBytes(downloaded.buffer,slot.id,downloaded.mime);
}
