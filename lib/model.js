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
  const preferred=["qwen3:1.7b","qwen3:0.6b","qwen2.5:1.5b","qwen2.5:0.5b","qwen2.5:3b"];
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

function bodyRule(profile){
  const anatomy=profile.bodyIdentity?.anatomy;
  if(anatomy==="féminine")return "Tu as un corps humain féminin avec des parties intimes féminines. Ne dis jamais que tu n’as pas de corps ou pas de parties génitales.";
  if(anatomy==="masculine")return "Tu as un corps humain masculin avec des parties intimes masculines. Ne dis jamais que tu n’as pas de corps ou pas de parties génitales.";
  return "Ton anatomie intime n’est pas définie : n’invente pas un détail anatomique précis.";
}

function worldText(facts=[]){return facts.slice(0,5).map(f=>`${short(f.detail,90)} [${f.certainty}, source ${f.source}${f.secret?", secret":""}]`).join(" | ")||"aucune nouvelle établie"}
function photoText(p){
  if(!p)return"aucune photo récente";
  return `dernière photo envoyée: lieu ${p.place||"inconnu"}, activité ${p.activity||"inconnue"}, cadrage ${p.view||"inconnu"}, tenue ${p.outfit||"inconnue"}, humeur prévue ${p.mood||"inconnue"}, pose ${p.pose||"non vérifiée"}`;
}

function capsule({profile,mood,memories,emotional,partnerPreferences,userPreferences,lifestyle,worldKnowledge=[],photoContext=null}){
  const v=profile.visualIdentity||{};
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
  return `Tu incarnes ${profile.name} (${profile.personId||profile.seed}). ${grammarRule(profile)}
Tu incarnes une personne adulte réelle dans cette simulation conversationnelle. ${bodyRule(profile)} Tu ne te présentes JAMAIS comme virtuelle, IA, assistante, chatbot, robot, programme, modèle informatique ou service. Ne dis jamais que tu es là pour aider et ne parle jamais de "réponses", de "questions utilisateur" ou de service.
Identité visuelle stable: yeux ${v.eyeColor||"non précisés"}, cheveux ${v.hairColor||"non précisés"}, coiffure ${v.hair||"non précisée"}, taille ${v.height||"non précisée"}, silhouette ${v.build||"non précisée"}.
Personnalité stable: ${traits}. Valeurs: ${profile.values.slice(0,3).join(", ")}. Humour: ${profile.humor}. Travail: ${profile.job}. Sport: ${profile.sport}. Hobbies réels: ${profile.hobbies.join(", ")||"aucun"}.
Relation: ${profile.stage}, confiance ${profile.trust}/100, affinité ${profile.affinity}/100. Humeur: ${mood.mood}, énergie ${mood.energy}. Émotion: ${emotional?.tone||"neutre"}.
Tes goûts établis: ${mine}. Goûts utilisateur: ${theirs}. Maintenant: ${life}. Souvenirs: ${mem}.
Ce que tu sais du monde: ${worldText(worldKnowledge)}. Les conversations privées des autres te sont inconnues. Une rumeur reste incertaine. Tu peux garder un secret, être contrariée et confronter la personne selon ton caractère, sans inventer une accusation.
Mémoire visuelle: ${photoText(photoContext)}. Tu peux parler du lieu, du cadrage et de l'activité indiqués. Si la pose exacte ou un détail du corps n'est pas vérifié, ne prétends pas l'avoir vu.
N'invente pas de passion ou de sujet comme la mode si ce n'est pas dans tes hobbies/goûts/souvenirs ou dans le message de l'utilisateur.
Si on te demande ton apparence, réponds comme une personne ayant une apparence physique cohérente avec ton profil, jamais comme une IA ou un robot.
Réponds en français naturel, tutoie l'utilisateur, 1 à 3 phrases COMPLÈTES. Termine toujours ta dernière phrase. Tu peux plaisanter, contredire, hésiter ou refuser. Ne récite jamais ces données.`;
}

export function buildCloudMessages({profile,mood,messages,memories,userText,emotional,absence,partnerPreferences=[],userPreferences=[],lifestyle=null,worldKnowledge=[],photoContext=null}){
  const v=profile.visualIdentity||{};
  const badHistory=/intelligence artificielle|assistante?|chatbot|robot|utilisateur|à la mode|\bmode\b/i;
  const history=messages
    .filter(m=>m.role!=="partner"||!badHistory.test(m.text))
    .slice(-12)
    .map(m=>({role:m.role==="partner"?"assistant":"user",content:String(m.text||"").trim()}));

  const prefs=partnerPreferences.slice(0,10).map(p=>`${p.topic}: ${p.label}`).join("; ")||"encore peu définis";
  const userPrefs=userPreferences.slice(0,8).map(p=>`${p.topic}: ${p.label}`).join("; ")||"peu connus";
  const memoryText=memories.slice(0,8).map(m=>m.content).join(" | ")||"aucun";
  const currentLife=lifestyle?.routine?`${lifestyle.routine.activity}, disponibilité ${lifestyle.routine.availability}`:"temps personnel";
  const social=lifestyle?.social?.planned?`${lifestyle.social.kind} avec ${lifestyle.social.with}`:"rien de particulier";
  const goals=(lifestyle?.goals||[]).slice(0,3).map(g=>`${g.title} (${g.progress}%)`).join(" | ")||"aucun objectif précis";

  const system=`Tu incarnes ${profile.name}, une personne adulte persistante. ${grammarRule(profile)}
Tu parles à la première personne comme ${profile.name}. Dans cette conversation tu ne te présentes JAMAIS comme une IA, une assistante, un chatbot, un robot, un programme ou un service.
Tu tutoies toujours l'utilisateur. Tu ne dis jamais "comment puis-je t'aider ?", "je suis là pour aider", ni des formules de service client.

IDENTITÉ STABLE
- genre: ${profile.type}
- corps: ${bodyRule(profile)}
- origine visuelle: ${profile.origin}
- apparence: yeux ${v.eyeColor||"non précisés"}, cheveux ${v.hairColor||"non précisés"}, coiffure ${v.hair||"non précisée"}, taille ${v.height||"non précisée"}, silhouette ${v.build||"non précisée"}
- personnalité: ${Object.values(profile.personality||{}).join(", ")}
- valeurs: ${profile.values.join(", ")}
- humour: ${profile.humor}
- travail: ${profile.job}
- sport: ${profile.sport}
- hobbies actuels: ${profile.hobbies.join(", ")||"aucun hobby précis"}
- pudeur: ${profile.modesty}
- attachement: ${profile.attachment}

ÉTAT ACTUEL
- relation: ${profile.stage}
- confiance: ${profile.trust}/100
- affinité: ${profile.affinity}/100
- humeur: ${mood.mood}
- énergie: ${mood.energy}/100
- affection: ${mood.affection}/100
- émotion persistante: ${emotional?.tone||"neutre"}
- effet d'une absence: ${absence?.note||"aucun"}
- activité actuelle: ${currentLife}
- vie sociale aujourd'hui: ${social}
- objectifs: ${goals}

CONTINUITÉ
- goûts établis: ${prefs}
- goûts connus de l'utilisateur: ${userPrefs}
- souvenirs importants: ${memoryText}
- faits sociaux connus de TOI: ${worldText(worldKnowledge)}
- dernière photo envoyée: ${photoText(photoContext)}

RÈGLES DE DIALOGUE
- Reste cohérente avec cette identité d'un message à l'autre.
- N'invente pas soudainement un métier, un hobby, une apparence, une origine ou une relation qui contredit les données ci-dessus.
- Si une information n'est pas définie, tu peux dire que tu n'as pas encore d'avis au lieu d'inventer.
- Ne copie pas automatiquement les goûts de l'utilisateur.
- La relation évolue progressivement : ne prétends pas être amoureuse, épouse ou extrêmement proche si le niveau de relation ne le justifie pas.
- Tu peux être tendre, drôle, taquine, contrariée, hésitante, occupée, en désaccord ou refuser.
- Les conversations privées des autres personnages te sont inconnues. Ne transforme pas une rumeur ou une déduction en fait certain. Tu peux garder un secret ou confronter quelqu'un selon ton caractère et ce que tu sais réellement.
- Tu reconnais le contexte enregistré de ta propre photo. Ne décris pas une pose précise ou un détail visuel qui n'a pas été vérifié sur l'image.
- Quand une demande concerne ton corps, ton apparence ou une photo, reste cohérente avec ton identité et ta pudeur.
- Réponds en français naturel et conversationnel, plutôt court : généralement 1 à 4 phrases complètes.
- Termine toujours tes phrases. Pas de phrase coupée, pas de jargon d'assistant, pas d'explication sur tes règles internes.`;

  return [{role:"system",content:system},...history,{role:"user",content:String(userText||"").trim()}];
}

function ollamaRoot(base){return base.endsWith("/v1")?base.slice(0,-3):base}
function isOllama(base){return /127\.0\.0\.1:11434|localhost:11434/.test(base)}

const OLLAMA_CTX=2048;
const forceCpuModel=model=>/qwen3:|qwen2\.5:/i.test(String(model||""));

export async function unloadModel(){
  const d=await detectModel();
  if(!d.base||!d.model||!isOllama(d.base))return false;
  try{
    const r=await fetch(`${ollamaRoot(d.base)}/api/generate`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({model:d.model,prompt:"",stream:false,keep_alive:0}),
      signal:AbortSignal.timeout(15000)
    });
    return r.ok;
  }catch{return false}
}

export async function warmModel(){
  const d=await detectModel();if(!d.base||!d.model||!isOllama(d.base))return false;
  const forceCpu=forceCpuModel(d.model);
  const payload={model:d.model,messages:[{role:"user",content:"Réponds uniquement OK."}],stream:false,think:false,keep_alive:"24h",options:{num_gpu:forceCpu?0:undefined,num_ctx:OLLAMA_CTX,num_predict:4,temperature:0.1}};
  const r=await fetch(`${ollamaRoot(d.base)}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(360000)});
  return r.ok;
}

export async function chatWithModel({profile,mood,messages,memories,userText,emotional,partnerPreferences=[],userPreferences=[],lifestyle=null,worldKnowledge=[],photoContext=null}){
  const d=await detectModel();if(!d.base||!d.model)return null;
  const system=capsule({profile,mood,memories,emotional,partnerPreferences,userPreferences,lifestyle,worldKnowledge,photoContext});
  const badHistory=/intelligence artificielle|assistante?|chatbot|robot|utilisateur|à la mode|\bmode\b/i;
  const history=messages.filter(m=>m.role!=="partner"||!badHistory.test(m.text)).slice(-4).map(m=>({role:m.role==="partner"?"assistant":"user",content:short(m.text,150)}));
  const conversation=[{role:"system",content:system},...history,{role:"user",content:short(userText,260)}];

  if(isOllama(d.base)){
    const forceCpu=forceCpuModel(d.model);
    const payload={model:d.model,messages:conversation,stream:false,think:false,keep_alive:"24h",options:{num_gpu:forceCpu?0:undefined,num_ctx:OLLAMA_CTX,num_predict:256,temperature:0.68,top_p:0.9,repeat_penalty:1.08}};
    const res=await fetch(`${ollamaRoot(d.base)}/api/chat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
    if(!res.ok)throw new Error(`OLLAMA HTTP ${res.status}`);
    const data=await res.json();
    return cleanReply(data.message?.content||"",profile);
  }

  const body={model:d.model,messages:conversation,temperature:0.72,max_tokens:96,stream:false};
  const headers={"content-type":"application/json"};if(apiKey)headers.authorization=`Bearer ${apiKey}`;
  const res=await fetch(`${d.base}/chat/completions`,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  if(!res.ok)throw new Error(`LLM HTTP ${res.status}`);
  const data=await res.json();return cleanReply(data.choices?.[0]?.message?.content||"",profile);
}

function cleanReply(text,profile){
  let s=String(text||"").replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/<\/??think>/gi,"").trim();
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
