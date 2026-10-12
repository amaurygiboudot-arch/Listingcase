import {correctDirectAddress} from './identity-reference.mjs';
export const normalizeDialogue=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function isStopRequest(text){
 return /^(?:arrete|stop|ca suffit|arrete de repeter|ne repete plus)(?: s il te plait| stp)?$/.test(normalizeDialogue(text));
}
export function controlReply(text){return isStopRequest(text)?"D’accord, j’arrête.":null;}
export function repetitionContext(messages){
 const recent=messages.slice(-8),counts=new Map();
 for(const m of recent)if(m.role!=='user'){const k=normalizeDialogue(m.text);counts.set(k,(counts.get(k)||0)+1);}
 let start=0;
 for(let i=0;i<recent.length;i++)if(recent[i].role==='user'&&isStopRequest(recent[i].text))start=i+1;
 return recent.slice(start).filter(m=>m.role==='user'||(counts.get(normalizeDialogue(m.text))||0)<2).slice(-4);
}
// Évite de transformer une scène commune jamais enregistrée en souvenir affirmé.
 // Une vraie déclaration utilisateur conservée reste une source possible.
export function stripUnverifiedSharedMoments(reply,memories=[]){
 const parts=String(reply).split(/(?<=[.!?])\s+/u);
 const known=(Array.isArray(memories)?memories:[]).filter(m=>m&&m.source==='message utilisateur'&&m.confidence===1).map(m=>normalizeDialogue(m.text));
 const keep=parts.filter(s=>{
  const normalized=normalizeDialogue(s);
  const match=normalized.match(/(?:ca me rappelle|je me souviens de|je me rappelle) (?:notre|nos) ([a-z0-9 ]+)/);
  if(match){
   const key=match[1].trim().split(/\s+/).slice(0,7).join(' ');
   return key.length>5&&known.some(v=>v.includes(key));
  }
  return !/(?:comme la derniere fois|souviens toi de notre premiere fois)/.test(normalized);
 });
 return keep.join(' ').trim()||"Je préfère ne pas inventer de souvenir partagé. Raconte-moi ce moment si tu en as envie.";
}
export function checkDialogueReply(reply,messages,text,memories=[]){
 reply=correctDirectAddress(stripUnverifiedSharedMoments(reply,memories));
 reply=reply.replace(/^Chérie([,!?.\s])/iu,'Mon cœur$1');
 if(!/\b(ip|adresse ip|réseau|serveur|accès distant)\b/i.test(text)){
  const parts=reply.split(/(?<=[.!?])\s+/u).filter(x=>!/\b(?:ton|votre|une) adresse IP\b/i.test(x));
  if(parts.length)reply=parts.join(' ').trim();
 }
 if(/\badb install\s+-r\b[^!?\n]{0,130}\bpour\s+compiler\b/i.test(reply)&&/\b(android|apk|compilation|compiler)\b/i.test(text)){
  return 'Pour vérifier la compilation Android, lance Gradle assembleDebug et contrôle le résultat. Puis utilise adb devices pour vérifier le téléphone ; adb install -r sert seulement à installer l’APK déjà compilée.';
 }
 const key=normalizeDialogue(reply);
 const same=messages.slice(-8).filter(m=>m.role!=='user'&&normalizeDialogue(m.text)===key);
 if(key.length>30&&same.length>=2)throw Error('Le moteur répète une ancienne réponse. Aucun nouveau message de Julie enregistré.');
 return reply.replace(/^Je suis désolé(?=[,.!\s]|$)/u,'Je suis désolée');
}
