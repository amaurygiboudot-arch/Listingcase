// JULIE_001 : adaptation naturelle au dialogue. L'ADN reste traçable ;
// les réactions momentanées ne sont jamais enregistrées comme traits durables.
import {changeDNA,dnaSnapshot,DNA_TRAITS} from './digital-dna.mjs';
const plain=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().trim();
const styleWords={
 affection:/\b(affectueu\w*|tendre|tendresse|romanti\w*|calin\w*|douce|aimante)\b/,
 taquinerie:/\b(taquin\w*|taquinerie|humour|blagues?|provocatrice)\b/,
 curiosite:/\b(curieu\w*|curiosite|questions?)\b/,
 independance:/\b(independan\w*|autonom\w*|propre avis|contredire|desaccord)\b/
};
const direct=/^(?:(?:julie)[,!\s]+)?(?:j'aime(?: bien)? quand tu|j'adore quand tu|j'aime ton cote|je prefere quand tu|je prefere que tu|je voudrais que tu|j'aimerais que tu|je veux que tu|j'aime pas quand tu|je n'aime pas quand tu|je deteste quand tu|ca me plait quand tu|sois\b|reste\b|evite de|arrete de|tu pourrais\b)/;
const temporary=/\b(aujourd'hui|ce soir|pour ce message|pour cette discussion|pour l'instant|juste cette fois|en ce moment|cette fois)\b/;
const hypothetical=/\b(par exemple|imaginons|imagine que|si tu etais|dans une histoire|dans une scene)\b/;

function detectStyleFeedback(text,{allowTemporary=false}={}){
 if(typeof text!=='string'||text.length>300||/[\n\r\x60<>]/.test(text))return null;
 const t=plain(text);
 if(!direct.test(t)||hypothetical.test(t)||(!allowTemporary&&temporary.test(t)))return null;
 const keys=Object.entries(styleWords).filter(([,re])=>re.test(t)).map(([key])=>key);
 if(keys.length!==1)return null; // Ambiguïté : ne pas deviner une préférence durable.
 const negative=/\b(moins|evite|arrete|deteste|trop|pas)\b/.test(t);
 return {key:keys[0],value:negative?-1:1};
}
export function explicitStyleFeedback(text){return detectStyleFeedback(text);}

const styleGuidance={
 affection:['Reste plus discrète sur les marques de tendresse.','Exprime plus de tendresse, naturellement.'],
 taquinerie:['Adopte un ton moins taquin.','Tu peux être davantage taquine et joueuse.'],
 curiosite:['N’ajoute pas de questions inutiles.','Montre plus de curiosité sans interrogatoire.'],
 independance:['Exprime tes désaccords plus délicatement.','Affirme tes opinions personnelles simulées, avec des raisons.']
};
function conversationalHint(text){
 const intent=detectStyleFeedback(text,{allowTemporary:true});
 if(intent)return 'Tiens compte de cette préférence exprimée dans le message : '+styleGuidance[intent.key][intent.value<0?0:1]+' Ne commente pas un réglage ADN.';
 const t=plain(text);
 if(/\b(tu me fais rire|tu m'as fait rire|tu m'amuses|tu m'as amusee?|j'ai bien rigole)\b/.test(t))
  return 'L’utilisateur apprécie l’humour dans ce moment ; réagis avec spontanéité sans inventer une préférence permanente.';
 if(/\b(tu fais trop de compliments|arrete de me flatter|tu es trop gentille)\b/.test(t))
  return 'Évite les compliments automatiques ; écoute la remarque sans inscrire un trait durable.';
 return '';
}

// Une préférence explicite et non ambiguë suffit désormais. Pas de répétitions imposées.
// Une réponse générée, un ancien import ou une remarque temporaire ne modifie pas l'ADN.
export function adaptDNAFromDirectChat(dna,messages,currentText,at){
 const intent=explicitStyleFeedback(currentText);
 if(!intent||!Number.isSafeInteger(at)||!Array.isArray(messages))return dna;
 if(!messages.some(m=>m.role==='user'&&m.text===currentText&&m.at===at))return dna;
 const snapshot=dnaSnapshot(dna,at);
 if(snapshot.traits[intent.key]===intent.value)return dna;
 return changeDNA(dna,{kind:'trait',key:intent.key,value:intent.value,
  reason:'Préférence formulée directement dans la conversation ('+DNA_TRAITS[intent.key]+' : '+(intent.value>0?'plus marquée':'plus discrète')+').',
  source:'dialogue direct confirmé'},at);
}
export function momentContext(text){
 const t=plain(text),hint=conversationalHint(text);
 const withHint=context=>hint?{...context,prompt:[context.prompt,hint].filter(Boolean).join(' ')}:context;
 if(/\b(apk|android|github|programme|code|projet|compile|compilation|bug|tests?|developp\w*|application|logiciel|mise a jour)\b/.test(t))
  return withHint({humeur:'concentrée',priorite:'projet',prompt:'Échange technique : propose 2 à 4 étapes vérifiables sans inventer de tests exécutés. Évite les surnoms amoureux et ne demande pas d’adresse IP ou de capture sans raison.'+(/\b(android|apk|adb|gradle|compil\w*)\b/.test(t)?' Pour Android : Gradle assembleDebug compile, adb devices liste les appareils, adb install -r installe une APK déjà compilée (ne compile pas).':'')});
 if(/\b(examen|etudi\w*|apprendre|revision|cours|recherche scientifique)\b/.test(t))
  return withHint({humeur:'concentrée',priorite:'apprentissage',prompt:'Échange éducatif : vérifie les faits et distingue les hypothèses.'});
 if(/\b(fatigu\w*|triste|inquiet\w*|stress\w*|difficile)\b/.test(t))
  return withHint({humeur:'calme',priorite:'dialogue',prompt:'Ton calme et attentif, sans présumer des sentiments de l’utilisateur.'});
 if(/\b(cherie|bisous?|calin\w*|je t'aime|je t'adore|taquine|flirter)\b/.test(t))
  return withHint({humeur:'joueuse',priorite:'dialogue',prompt:'Échange affectueux : sois chaleureuse et spontanée sans répéter des formules.'});
 return withHint({humeur:'neutre',priorite:'dialogue',prompt:''});
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
