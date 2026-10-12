// JULIE : apprentissage traçable, local, et sans inférence psychologique automatique.
// Un échange est archivé par le dialogue existant. Seules les déclarations explicites
// de l'utilisateur peuvent enrichir le journal ; les recherches restent des sources externes.
export const LEARNING_MAX=500;
const explicitStatement=/^\s*(?:(?:je|j['’]ai|j['’]aime|je préfère|je travaille|je veux|j['’]habite|mon|ma|mes|notre|nous)\b|(?:rappelle[- ]toi|retiens|note que|souviens[- ]toi que)\b)/i;
const correction=/\b(?:tu te trompes|c'est faux|ce n'est pas vrai|je te corrige|correction\s*:)\b/i;
export function extractLearning(text,at=Date.now()){
  if(typeof text!=='string'||!Number.isFinite(at)||at<0)return null;
  const cleaned=text.replace(/\s+/g,' ').trim();
  if(cleaned.length<6||cleaned.length>360||/[?]$/.test(cleaned))return null;
  const isCorrection=correction.test(cleaned);
  if(!isCorrection&&!explicitStatement.test(cleaned))return null;
  return {kind:isCorrection?'correction utilisateur':'déclaration utilisateur',content:cleaned,
    source:'message utilisateur',at,confidence:isCorrection?'à confirmer':'déclaré',verified:false};
}
export function captureLearning(state,text,at=Date.now()){
  const entry=extractLearning(text,at);
  if(!entry)return state;
  const existing=Array.isArray(state.learning)?state.learning:[];
  if(existing.some(x=>x.kind===entry.kind&&x.content===entry.content))return state;
  // Sans troncature silencieuse d'anciennes connaissances.
  if(existing.length>=LEARNING_MAX)return state;
  return {...state,learning:[...existing,entry]};
}
export function dailyLearnings(state,now=Date.now(),offsetMinutes=-new Date(now).getTimezoneOffset()){
  // L'offset vient de l'appareil pour respecter son jour civil.
  const offset=Number(offsetMinutes)||0;
  const day=ms=>Math.floor((ms+offset*60_000)/86_400_000);
  const today=day(now);
  const learned=(Array.isArray(state?.learning)?state.learning:[])
    .filter(x=>day(Number(x.at))===today);
  const sources=(Array.isArray(state?.research)?state.research:[])
    .filter(x=>day(Number(x.at))===today);
  return {learned,sources,date:new Date(now+offset*60_000).toISOString().slice(0,10)};
}
export function isDailyLearningQuestion(text){
  return /\b(?:qu['’]est[- ]ce que tu as appris aujourd['’]hui|qu['’]as[- ]tu appris aujourd['’]hui|tu as appris quoi aujourd['’]hui|bilan de tes apprentissages aujourd['’]hui)\s*\??\s*$/i.test(String(text||'').trim());
}
export function replyDailyLearning(state,now=Date.now(),offsetMinutes=-new Date(now).getTimezoneOffset()){
  const daily=dailyLearnings(state,now,offsetMinutes);
  if(!daily.learned.length&&!daily.sources.length)
    return "Aujourd'hui, je n'ai encore enregistré aucun nouvel apprentissage vérifiable. Je préfère te le dire plutôt qu'inventer mes découvertes.";
  const notes=daily.learned.slice(-3).map(x=>"«"+x.content+"» ("+x.confidence+")");
  const links=daily.sources.slice(-2).map(x=>(x.title||"Page consultée")+" ("+x.url+", non vérifiée)");
  const parts=[];
  if(notes.length)parts.push("Dans nos échanges, j'ai retenu : "+notes.join(" ; ")+".");
  if(links.length)parts.push("Comme sources Web enregistrées : "+links.join(" ; ")+".");
  parts.push("Ce sont des informations enregistrées, pas des vérités que j'ai vérifiées toute seule.");
  return parts.join(" ");
}
