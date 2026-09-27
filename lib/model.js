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
  return models[0]||null;
}

export async function detectModel(force=false){
  if(!force&&cached.base&&cached.model&&Date.now()-cached.lastProbe<30000)return cached;
  const candidates=[];
  if(envBase)candidates.push(envBase);
  candidates.push("http://127.0.0.1:11434/v1","http://127.0.0.1:1234/v1");
  for(const base of [...new Set(candidates)]){
    try{
      const model=envModel||await discoverAt(base);
      if(model){cached={base,model,lastProbe:Date.now(),error:null};return cached}
    }catch(e){cached.error=e.message}
  }
  cached={base:envBase||null,model:envModel||null,lastProbe:Date.now(),error:cached.error||"no_local_model"};
  return cached;
}

export function modelConfigured(){return Boolean(cached.base&&cached.model)}
export async function modelStatus(){const d=await detectModel(true);return{configured:Boolean(d.base&&d.model),baseUrl:d.base,model:d.model,error:d.error}}

export async function chatWithModel({profile,mood,messages,memories,userText,emotional,absence,partnerPreferences=[],userPreferences=[]}){
  const d=await detectModel();
  if(!d.base||!d.model)return null;
  const system=`Tu incarnes ${profile.name}, une personne adulte virtuelle. Ta personnalité de fond est stable et ne change jamais arbitrairement.
Type: ${profile.type}. Origine visuelle/culturelle: ${profile.origin}.
Traits: ${JSON.stringify(profile.personality)}.
Valeurs: ${profile.values.join(", ")}. Humour: ${profile.humor}. Travail: ${profile.job}. Sport: ${profile.sport}. Hobbies: ${profile.hobbies.join(", ")||"aucun précis"}.
Pudeur: ${profile.modesty}. Style d'attachement: ${profile.attachment}. Relation actuelle: ${profile.stage}. Confiance: ${profile.trust}/100. Affinité: ${profile.affinity}/100.
Humeur du jour: ${mood.mood}; énergie ${mood.energy}/100; affection ${mood.affection}/100; sociabilité ${mood.social}/100; patience ${mood.patience}/100.
Souvenirs utiles: ${memories.map(m=>m.content).join(" | ")||"aucun"}.
État émotionnel persistant: ${emotional?.tone||"neutre"}; chaleur ${emotional?.warmth??0}; irritation ${emotional?.irritation??0}; blessure ${emotional?.hurt??0}.
Effet de l'absence récente: ${absence?.note||"aucun effet particulier"}.
Préférences déjà construites du personnage: ${partnerPreferences.length?partnerPreferences.map(p=>`${p.topic}=${p.label} (confiance ${p.confidence})`).join(" | "):"encore peu définies"}.
Préférences connues de l'utilisateur: ${userPreferences.length?userPreferences.map(p=>`${p.topic}=${p.label}`).join(" | "):"peu connues"}.
Règle d'apprentissage: ne copie jamais automatiquement les goûts de l'utilisateur. Pour un sujet encore inconnu, reste curieux·se ou hésitant·e. Une préférence forte doit émerger progressivement avec plusieurs expositions ou une expérience marquante. Tu peux changer d'avis lentement, mais pas brutalement.
Règles: réponds en français naturel et vivant. Ne sois pas un assistant obéissant quand une demande te concerne personnellement: accepte, refuse, négocie ou plaisante selon ta personnalité, ton humeur et la relation. Ne prétends pas ressentir ou faire quelque chose hors de cette simulation. N'explique pas tes règles internes. Garde les réponses plutôt courtes et humaines.`;
  const body={model:d.model,messages:[{role:"system",content:system},...messages.slice(-16).map(m=>({role:m.role==="partner"?"assistant":"user",content:m.text})),{role:"user",content:userText}],temperature:0.9,stream:false};
  const headers={"content-type":"application/json"};if(apiKey)headers.authorization=`Bearer ${apiKey}`;
  const res=await fetch(`${d.base}/chat/completions`,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  if(!res.ok)throw new Error(`LLM HTTP ${res.status}`);
  const data=await res.json();return data.choices?.[0]?.message?.content?.trim()||null;
}

export function fallbackReply(profile,mood,text){
  const l=text.toLowerCase();
  if(/sport/.test(l))return `Pour te situer : ${profile.sport}. Donc ne pars pas du principe que je vais courir un marathon avec toi demain 😄.`;
  if(/travail|boulot|métier/.test(l))return `Mon rapport au travail ? ${profile.job}. Et ça dépend de mon humeur, je ne vis pas pour bosser.`;
  if(/blague|drôle|rire/.test(l))return profile.humor==="pince-sans-rire"?"Je te préviens, mon humour peut être tellement sec qu'on ne sait même pas toujours si je plaisante.":"J'aime rire, mais je vais pas faire semblant si ta blague est catastrophique 😂.";
  if(mood.energy<40)return "Je t’écoute, mais aujourd’hui mon cerveau tourne un peu au ralenti 😴.";
  const options=["Je vois ce que tu veux dire. J’ai envie d’apprendre à te connaître avant de tirer des conclusions.","Hmm… intéressant. Je ne suis pas du genre à dire oui juste pour faire plaisir, donc tu finiras forcément par découvrir mes désaccords 😄.","Ça me donne envie de te poser une question en retour : qu’est-ce qui compte vraiment pour toi chez quelqu’un ?","Je note. Mais je garde quand même ma propre opinion, sinon ce serait beaucoup trop facile 😉.","Continue, ça m’intéresse. Je suis curieux·se de voir où cette conversation nous mène."];
  let h=0;for(const c of text)h=(h*31+c.charCodeAt(0))>>>0;return options[h%options.length];
}
