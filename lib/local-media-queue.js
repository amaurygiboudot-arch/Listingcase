import fs from "node:fs";
import { generateVisual } from "./image-provider.js";
import { saveCharacterVisual } from "./visual.js";
import { analyzeGeneratedVisual,qualityRetryHint } from "./visual-quality.js";
import { noteVisualScene } from "./scene-continuity.js";
import { getCharacterMedia,updateCharacterMedia } from "./character-store.js";

const jobs=new Set();
let chain=Promise.resolve();

const parseMeta=media=>{
  if(!media)return{};
  if(media.meta&&typeof media.meta==="object")return media.meta;
  try{return JSON.parse(media.meta||"{}")}catch{return{}}
};

async function run(job){
  const key=`${job.personId}:${job.mediaId}`;
  try{
    const current=getCharacterMedia(job.personId,job.mediaId);
    if(!current||current.status!=="pending")return;
    const meta=parseMeta(current);
    const maxAttempts=Math.max(1,Math.min(5,Number(process.env.VISUAL_QUALITY_MAX_ATTEMPTS||3)));
    let generated=null,quality=null,attempt=0,prompt=job.prompt;
    for(attempt=1;attempt<=maxAttempts;attempt++){
      generated=await generateVisual(job.profile,job.slot,prompt,{
        referencePath:job.referencePath,
        requestVisual:job.requestVisual||{}
      });
      if(!generated)throw new Error("local_generation_no_output");
      quality=await analyzeGeneratedVisual({
        filePath:generated.filePath,
        profile:job.profile,
        requestVisual:job.requestVisual||{}
      });
      if(quality.approved)break;
      try{fs.rmSync(generated.filePath,{force:true})}catch{}
      generated=null;
      if(!quality.available)throw new Error(`visual_quality_unavailable:${quality.reason||"unknown"}`);
      const hint=qualityRetryHint(quality);
      prompt=`${job.prompt}, quality correction: ${hint}, anatomically natural, no deformation`;
    }
    if(!generated)throw new Error(`visual_quality_rejected:${(quality?.reasons||[]).join(",")||"unknown"}`);
    const saved=saveCharacterVisual(job.profile,job.slot.id,generated.filePath,generated.mimeType,{canonical:false});
    const url="/"+String(saved.file_path).replace(/^\/+/, "");
    updateCharacterMedia(job.personId,job.mediaId,{
      url,
      status:"ready",
      alt:`Photo de ${job.profile.name}`,
      visualId:job.slot.id,
      meta:{
        ...meta,
        completedAt:Date.now(),
        failure:null,
        qualityAttempts:attempt,
        qualityVerified:Boolean(quality?.available),
        qualityModel:quality?.model||null,
        qualityReport:quality?.report||null,
        verifiedVisual:quality?.observed||null
      }
    });
    if(job.slot.place)noteVisualScene(job.profile,job.slot.place);
  }catch(e){
    const current=getCharacterMedia(job.personId,job.mediaId);
    const meta=parseMeta(current);
    updateCharacterMedia(job.personId,job.mediaId,{
      status:"error",
      alt:"La génération de la photo a échoué.",
      meta:{...meta,error:String(e?.message||e),failedAt:Date.now()}
    });
    console.error("LOCAL IMAGE JOB:",e?.message||e);
  }finally{
    jobs.delete(key);
  }
}

export function enqueueLocalMediaGeneration(job){
  const key=`${job.personId}:${job.mediaId}`;
  if(jobs.has(key))return false;
  jobs.add(key);
  chain=chain.then(()=>run(job)).catch(e=>{
    jobs.delete(key);
    console.error("LOCAL IMAGE QUEUE:",e?.message||e);
  });
  return true;
}

export function localMediaQueueStatus(){
  return{active:jobs.size,queued:[...jobs]};
}
