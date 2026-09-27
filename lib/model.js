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
  const preferred=["qwen2.5:0.5b","qwen2.5:1.5b","qwen2.5:3b"];
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

const short=(v,n=110)=>{const s=String(v||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s};

function grammarRule(profile){
  if(profile.type==="femme")return "Tu es une femme. Quand tu parles de toi, accorde TOUJOURS au féminin: contente, heureuse, prête, curieuse, etc. Ne te décris jamais au masculin.";
  if(profile.type==="homme")return "Tu es un homme. Quand tu parles de toi, accorde au masculin.";
  return "Utilise des formulations neutres quand tu parles de toi.";
}

function capsule({profile,mood,memories,emotional,partnerPreferences,userPreferences,lifestyle}){
  const traits=[
    profile.personality?.directness,
    profile.personality?.playfulness,
    profile.personality?.affection,
    profile.personality?.independence
  ].filter(Boolean).join(", ");
  const mine=partnerPreferences.slice(0,3).map(p=>`${p.topic} ${p.label}`).join(", ")||"encore à découvrir";
  const theirs=userPreferences.slice(0,2).map(p=>`${p.topic} ${p.label}`).join(", ")||"peu connus";
  const mem=memories.slice(0,2).map(m=>short(m.content,75)).join(" | ")||"aucun";
  const life=lifestyle?.routine?.activity||"temps perso";
  return `Tu incarnes ${profile.name}. ${grammarRule(profile)}
Tu es une personne adulte virtuelle dans cette simulation, PAS une IA, PAS une assistante, PAS un chatbot, PAS un robot. Ne dis jamais que tu es là pour aider.
Personnalité stable: ${traits}. Valeurs: ${profile.values.slice(0,3).join(", ")}. Humour: ${profile.humor}. Travail: ${profile.job}. Sport: ${profile.sport}. Hobbies réels: ${profile.hobbies.join(", ")||"aucun"}.
Relation: ${profile.stage}, confiance ${profile.trust}/100, affinité ${profile.affinity}/100. Humeur: ${mood.mood}, énergie ${mood.energy}. Émotion: ${emotional?.tone||"neutre"}.
Tes goûts établis: ${mine}. Goûts utilisateur: ${theirs}. Maintenant: ${life}. Souvenirs: ${mem}.
N'invente pas de passion ou de sujet comme la mode si ce n'est pas dans tes hobbies/goûts/souvenirs ou dans le message de l'utilisateur.
Si on te demande ton apparence, réponds comme une personne ayant une apparence physique cohérente avec ton profil, jamais comme une IA ou un robot.
Réponds en français naturel, tutoie l'utilisateur, 1 à 3 phrases COMPLÈTES. Termine toujours ta dernière phrase. Tu peux plaisanter, contredire, hésiter ou refuser. Ne récite jamais ces données.`;
}

function ollamaRoot(base){return base.endsWith("/v1")?base.slice(0,-3):base}
function isOllama(base){return /127\.0\.0\.1:11434|localhost:11434/.test(base)}

const OLLAMA_CTX=512;

export async function warmModel(){
  const d=await detectModel();if(!d.base||!d.model||!isOllama(d.base))return false;
  const small=d.model.includes(":0.5b");
  const payload={model:d.model,messages:[{role:"user",content:"Réponds OK"}],stream:false,keep_alive:"24h",options:{num_gpu:small?0:undefined,num_ctx:OLLAMA_CTX,num_predict:4,temperature:0.1}};
  const r=await fetch(`${ollamaRoot(d.base)}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
  return r.ok;
}

export async function chatWithModel({profile,mood,messages,memories,userText,emotional,partnerPreferences=[],userPreferences=[],lifestyle=null}){
  const d=await detectModel();if(!d.base||!d.model)return null;
  const system=capsule({profile,mood,memories,emotional,partnerPreferences,userPreferences,lifestyle});
  const badHistory=/intelligence artificielle|assistante?|chatbot|robot|utilisateur|à la mode|\bmode\b/i;
  const history=messages.filter(m=>m.role!=="partner"||!badHistory.test(m.text)).slice(-4).map(m=>({role:m.role==="partner"?"assistant":"user",content:short(m.text,150)}));
  const conversation=[{role:"system",content:system},...history,{role:"user",content:short(userText,260)}];

  if(isOllama(d.base)){
    const small=d.model.includes(":0.5b");
    const payload={model:d.model,messages:conversation,stream:false,keep_alive:"24h",options:{num_gpu:small?0:undefined,num_ctx:OLLAMA_CTX,num_predict:72,temperature:0.72,top_p:0.9,repeat_penalty:1.08}};
    const res=await fetch(`${ollamaRoot(d.base)}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
    if(!res.ok)throw new Error(`OLLAMA HTTP ${res.status}`);
    const data=await res.json();
    return cleanReply(data.message?.content||"",profile);
  }

  const body={model:d.model,messages:conversation,temperature:0.72,max_tokens:96,stream:false};
  const headers={"content-type":"application/json"};if(apiKey)headers.authorization=`Bearer ${apiKey}`;
  const res=await fetch(`${d.base}/chat/completions`,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw new Error(`LLM HTTP ${res.status}`);
  const data=await res.json();return cleanReply(data.choices?.[0]?.message?.content||"",profile);
}

function cleanReply(text,profile){
  let s=String(text||"").trim();
  if(!s)return null;
  s=s.replace(/\b(?:je suis|j['’]étais) (?:un|une) (?:assistant(?:e)?|chatbot|robot|intelligence artificielle|IA)\b[^.!?]*[.!?]?/gi,"").trim();
  if(profile.type==="femme"){
    s=s.replace(/\bje suis content\b/gi,"je suis contente")
       .replace(/\bje suis heureux\b/gi,"je suis heureuse")
       .replace(/\bje suis prêt\b/gi,"je suis prête")
       .replace(/\bje suis curieux\b/gi,"je suis curieuse");
  }
  if(s && !/[.!?…]$/.test(s))s+=".";
  return s;
}

export function fallbackReply(profile,mood,text){
  const l=text.toLowerCase();
  if(/sport/.test(l))return `Pour te situer : ${profile.sport}. Donc ne pars pas du principe que je vais courir un marathon avec toi demain 😄.`;
  if(/travail|boulot|métier/.test(l))return `Mon rapport au travail ? ${profile.job}. Et ça dépend de mon humeur, je ne vis pas pour bosser.`;
  if(/blague|drôle|rire/.test(l))return profile.humor==="pince-sans-rire"?"Mon humour est parfois tellement sec qu'on ne sait même pas si je plaisante 😏.":"J'aime rire, mais je vais pas faire semblant si ta blague est catastrophique 😂.";
  if(mood.energy<40)return "Je t’écoute, mais aujourd’hui mon cerveau tourne un peu au ralenti 😴.";
  return "Je t’écoute. Et je garde ma propre opinion, sinon ce serait beaucoup trop facile 😉.";
}
