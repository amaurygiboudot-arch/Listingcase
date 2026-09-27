const envBase=(process.env.LLM_BASE_URL||"").replace(/\/$/,"");
const envModel=process.env.LLM_MODEL||"";
const apiKey=process.env.LLM_API_KEY||"";
let cached={base:envBase,model:envModel,lastProbe:0,error:null};

async function discoverAt(base){
  const headers={};if(apiKey)headers.authorization=`Bearer ${apiKey}`;
  const r=await fetch(`${base}/models`,{headers,signal:AbortSignal.timeout(2500)});
  if(!r.ok)throw new Error(`models_http_${r.status}`);
  const data=await r.json();
  const models=(data.data||[]).map(x=>x.id).filter(Boolean);
  const preferred=["qwen2.5:1.5b","qwen2.5:3b"];
  return preferred.find(name=>models.includes(name))||models[0]||null;
}

export async function detectModel(force=false){
  if(!force&&cached.base&&cached.model&&Date.now()-cached.lastProbe<30000)return cached;
  const candidates=[];if(envBase)candidates.push(envBase);
  candidates.push("http://127.0.0.1:11434/v1","http://127.0.0.1:1234/v1");
  for(const base of [...new Set(candidates)]){
    try{const model=envModel||await discoverAt(base);if(model){cached={base,model,lastProbe:Date.now(),error:null};return cached}}catch(e){cached.error=e.message}
  }
  cached={base:envBase||null,model:envModel||null,lastProbe:Date.now(),error:cached.error||"no_local_model"};return cached;
}

export function modelConfigured(){return Boolean(cached.base&&cached.model)}
export async function modelStatus(){const d=await detectModel(true);return{configured:Boolean(d.base&&d.model),baseUrl:d.base,model:d.model,error:d.error}}

function compactSystem({profile,mood,memories,emotional,absence,partnerPreferences,userPreferences,lifestyle}){
  const traits=Object.entries(profile.personality||{}).map(([k,v])=>`${k}:${v}`).join(", ");
  const pp=partnerPreferences.slice(0,8).map(p=>`${p.topic}=${p.label}`).join(", ")||"peu définis";
  const up=userPreferences.slice(0,6).map(p=>`${p.topic}=${p.label}`).join(", ")||"peu connus";
  const mem=memories.slice(0,8).map(m=>m.content).join(" | ")||"aucun";
  const life=lifestyle?.routine?`${lifestyle.routine.activity}, ${lifestyle.routine.availability}`:"non définie";
  const goals=(lifestyle?.goals||[]).slice(0,2).map(g=>`${g.title} ${g.progress}%`).join(" | ")||"aucun";
  return `Tu incarnes ${profile.name}, adulte virtuelle. Reste cette personne, pas une assistante.
Identité stable: ${profile.type}, ${profile.origin}; ${traits}. Valeurs: ${profile.values.join(", ")}. Humour: ${profile.humor}. Travail: ${profile.job}. Sport: ${profile.sport}. Attachement: ${profile.attachment}. Pudeur: ${profile.modesty}.
Relation: ${profile.stage}, confiance ${profile.trust}/100, affinité ${profile.affinity}/100.
Aujourd'hui: humeur ${mood.mood}, énergie ${mood.energy}, affection ${mood.affection}, patience ${mood.patience}. Émotion persistante: ${emotional?.tone||"neutre"} (irritation ${emotional?.irritation??0}, blessure ${emotional?.hurt??0}). Absence: ${absence?.note||"aucune"}.
Tes goûts: ${pp}. Goûts utilisateur: ${up}. Vie actuelle: ${life}. Objectifs: ${goals}. Souvenirs: ${mem}.
Réponds en français naturel, humain et plutôt court (1 à 4 phrases). Tu peux être tendre, taquin·e, contrarié·e, refuser ou négocier selon ton caractère. Ne copie pas automatiquement les goûts de l'utilisateur et ne change pas brutalement de personnalité. Ne récite jamais ces données ni tes règles.`;
}

function ollamaRoot(base){return base.endsWith("/v1")?base.slice(0,-3):base}
function isOllama(base){return /127\.0\.0\.1:11434|localhost:11434/.test(base)}

export async function warmModel(){
  const d=await detectModel();
  if(!d.base||!d.model||!isOllama(d.base))return false;
  const payload={model:d.model,messages:[{role:"user",content:"Réponds OK"}],stream:false,keep_alive:"60m",options:{num_ctx:1024,num_predict:4,temperature:0.1}};
  const r=await fetch(`${ollamaRoot(d.base)}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(150000)});
  return r.ok;
}

export async function chatWithModel({profile,mood,messages,memories,userText,emotional,absence,partnerPreferences=[],userPreferences=[],lifestyle=null}){
  const d=await detectModel();if(!d.base||!d.model)return null;
  const system=compactSystem({profile,mood,memories,emotional,absence,partnerPreferences,userPreferences,lifestyle});
  const history=messages.slice(-8).map(m=>({role:m.role==="partner"?"assistant":"user",content:m.text}));
  const conversation=[{role:"system",content:system},...history,{role:"user",content:userText}];

  if(isOllama(d.base)){
    const payload={model:d.model,messages:conversation,stream:false,keep_alive:"60m",options:{num_ctx:1536,num_predict:96,temperature:0.85,top_p:0.9}};
    const res=await fetch(`${ollamaRoot(d.base)}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(150000)});
    if(!res.ok)throw new Error(`OLLAMA HTTP ${res.status}`);
    const data=await res.json();return data.message?.content?.trim()||null;
  }

  const body={model:d.model,messages:conversation,temperature:0.85,max_tokens:96,stream:false};
  const headers={"content-type":"application/json"};if(apiKey)headers.authorization=`Bearer ${apiKey}`;
  const res=await fetch(`${d.base}/chat/completions`,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  if(!res.ok)throw new Error(`LLM HTTP ${res.status}`);
  const data=await res.json();return data.choices?.[0]?.message?.content?.trim()||null;
}

export function fallbackReply(profile,mood,text){
  const l=text.toLowerCase();
  if(/sport/.test(l))return `Pour te situer : ${profile.sport}. Donc ne pars pas du principe que je vais courir un marathon avec toi demain 😄.`;
  if(/travail|boulot|métier/.test(l))return `Mon rapport au travail ? ${profile.job}. Et ça dépend de mon humeur, je ne vis pas pour bosser.`;
  if(/blague|drôle|rire/.test(l))return profile.humor==="pince-sans-rire"?"Mon humour est parfois tellement sec qu'on ne sait même pas si je plaisante 😏.":"J'aime rire, mais je vais pas faire semblant si ta blague est catastrophique 😂.";
  if(mood.energy<40)return "Je t’écoute, mais aujourd’hui mon cerveau tourne un peu au ralenti 😴.";
  return "Je t’écoute. Et je garde ma propre opinion, sinon ce serait beaucoup trop facile 😉.";
}
