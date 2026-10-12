// JULIE_001 : adaptation prudente au dialogue. Aucune analyse du texte généré,
// aucune écriture de données et aucun changement des accords ou de l'identité.
import {changeDNA,dnaSnapshot,DNA_TRAITS} from './digital-dna.mjs';
const plain=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().trim();
const styleWords={
 affection:/\b(affectueu\w*|tendre|tendresse|romanti\w*|calin\w*|douce|aimante)\b/,
 taquinerie:/\b(taquin\w*|taquinerie|humour|blagues?|provocatrice)\b/,
 curiosite:/\b(curieu\w*|curiosite|questions?)\b/,
 independance:/\b(independant\w*|autonom\w*|propre avis|contredire|desaccord)\b/
};
const direct=/^(?:(?:julie)[,!\s]+)?(?:j'aime quand tu|j'adore quand tu|j'aime ton cote|je prefere quand tu|je prefere que tu|je voudrais que tu|j'aimerais que tu|je veux que tu|sois\b|reste\b|evite de|arrete de)/;
export function explicitStyleFeedback(text){
 if(typeof text!=='string'||text.length>300||/[\n\r\x60<>]/.test(text))return null;
 const t=plain(text);
 if(!direct.test(t))return null;
 const keys=Object.entries(styleWords).filter(([,re])=>re.test(t)).map(([k])=>k);
 if(keys.length!==1)return null;
 const negative=/\b(moins|evite|arrete|pas trop|plus sobre|moins de)\b/.test(t);
 return {key:keys[0],value:negative?-1:1};
}
// Une variation permanente exige 3 déclarations EXPLICITES à 3 moments
// espacés d'au moins 15 minutes, et postérieures à la dernière évolution du trait.
// Les messages importés ne déclenchent rien tant que l'utilisateur ne réitère
// pas lui-même une nouvelle préférence dans la conversation active.
export function adaptDNAFromDirectChat(dna,messages,currentText,at){
 const intent=explicitStyleFeedback(currentText);
 if(!intent||!Number.isSafeInteger(at)||!Array.isArray(messages))return dna;
 const snapshot=dnaSnapshot(dna,at);
 if(snapshot.traits[intent.key]===intent.value)return dna;
 const lastChange=Math.max(dna.erasedBefore,...dna.events.filter(e=>e.kind==='trait'&&e.key===intent.key).map(e=>e.at),0);
 const matches=messages.filter(m=>m.role==='user'&&Number.isSafeInteger(m.at)&&m.at>lastChange&&m.at<=at&&
  m.at>at-90*86400000).filter(m=>{
    const s=explicitStyleFeedback(m.text);
    return s?.key===intent.key&&s.value===intent.value;
  }).sort((a,b)=>a.at-b.at);
 const distinct=[];
 for(const m of matches)if(!distinct.length||m.at-distinct.at(-1)>=15*60*1000)distinct.push(m.at);
 if(distinct.length<3||distinct.at(-1)!==at)return dna;
 return changeDNA(dna,{kind:'trait',key:intent.key,value:intent.value,
  reason:'Préférence explicitement répétée à trois moments distincts.',
  source:'dialogue direct confirmé'},at);
}
export function momentContext(text){
 const t=plain(text);
 if(/\b(apk|android|github|programme|code|projet|compile|compilation|bug|tests?|developp\w*|application|logiciel|mise a jour)\b/.test(t))
  return {humeur:'concentrée',priorite:'projet',prompt:'Échange technique : propose 2 à 4 étapes vérifiables et cite les outils précis si connus, sans inventer de tests exécutés. Évite les surnoms amoureux.'};
 if(/\b(examen|etudi\w*|apprendre|revision|cours|recherche scientifique)\b/.test(t))
  return {humeur:'concentrée',priorite:'apprentissage',prompt:'Échange éducatif : vérifie les faits et distingue les hypothèses.'};
 if(/\b(fatigu\w*|triste|inquiet\w*|stress\w*|difficile)\b/.test(t))
  return {humeur:'calme',priorite:'dialogue',prompt:'Ton calme et attentif, sans présumer des sentiments de l’utilisateur.'};
 if(/\b(cherie|bisous?|calin\w*|je t'aime|je t'adore|taquine|flirter)\b/.test(t))
  return {humeur:'joueuse',priorite:'dialogue',prompt:'Échange affectueux : sois chaleureuse et spontanée sans répéter des formules.'};
 return {humeur:'neutre',priorite:'dialogue',prompt:''};
}
export function latestMoment(messages,now=Date.now()){
 const m=Array.isArray(messages)?[...messages].reverse().find(x=>x.role==='user'):null;
 if(!m||!Number.isFinite(m.at)||m.at>now||now-m.at>4*60*60*1000)return momentContext('');
 return momentContext(m.text);
}
export function personalitySummary(dna,messages,now=Date.now()){
 const s=dnaSnapshot(dna,now),m=latestMoment(messages,now);
 return {foundation:s.foundation,traits:s.traits,revisions:s.revision,
  current:{humeur:m.humeur==='neutre'?s.current.humeur:m.humeur,
           priorite:m.priorite==='dialogue'?s.current.priorite:m.priorite},
  traitLabels:DNA_TRAITS};
}
