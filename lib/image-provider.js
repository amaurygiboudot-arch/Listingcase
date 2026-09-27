const comfyBase=(process.env.COMFYUI_BASE_URL||"http://127.0.0.1:8188").replace(/\/$/,"");

export async function imageProviderStatus(){
  try{
    const r=await fetch(`${comfyBase}/system_stats`,{signal:AbortSignal.timeout(2500)});
    if(!r.ok)throw new Error(`http_${r.status}`);
    const data=await r.json();
    return{configured:true,provider:"comfyui",baseUrl:comfyBase,system:data.system||null,devices:data.devices||[]};
  }catch(e){
    return{configured:false,provider:"comfyui",baseUrl:comfyBase,error:e.message};
  }
}

export function buildVisualPrompt(profile,slot,visualState={}){
  const identity=`${profile.type}, origine visuelle ${profile.origin}, adulte`;
  const continuity=[
    visualState.hair&&`coiffure ${visualState.hair}`,
    visualState.outfit&&`tenue ${visualState.outfit}`,
    visualState.place&&`lieu ${visualState.place}`
  ].filter(Boolean).join(", ");
  return [
    "Portrait photoréaliste cohérent d'un même personnage adulte",
    identity,
    `humeur ${slot.mood}`,
    `lieu ${slot.place}`,
    `moment ${slot.moment}`,
    `météo ${slot.weather}`,
    `tenue ${slot.outfit}`,
    `coiffure ${slot.hair}`,
    `activité ${slot.activity}`,
    continuity&&`continuité visuelle: ${continuity}`,
    "visage cohérent, lumière naturelle, anatomie réaliste"
  ].filter(Boolean).join(", ");
}

export async function queueComfyWorkflow(workflow){
  const status=await imageProviderStatus();
  if(!status.configured)throw new Error("comfyui_unavailable");
  const r=await fetch(`${comfyBase}/prompt`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({prompt:workflow})
  });
  if(!r.ok)throw new Error(`comfyui_http_${r.status}`);
  return r.json();
}
