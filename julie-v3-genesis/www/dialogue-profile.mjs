import {appearanceReply} from './identity-reference.mjs';
import {DNA_FOUNDATION} from './digital-dna.mjs';
// Facts from the approved identity. These replies are profile lookups, not model generations.
const normalize=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").trim();
export function profileReply(text){
 const appearance=appearanceReply(text);if(appearance)return appearance;
 const t=normalize(text);
 if(/^(comment (?:est-ce que )?je m'appelle|quel est mon (?:prenom|nom)|tu (?:sais|connais|te souviens de) mon prenom)\s*[?!.]*$/.test(t))
  return "Tu t'appelles Amaury.";
 if(/^(comment (?:est-ce que )?tu t'appelles|quel est ton (?:prenom|nom)|qui es-tu)\s*[?!.]*$/.test(t))
  return "Je m'appelle "+DNA_FOUNDATION.name+", ta compagne virtuelle.";
 if(/(?:emotions?|sentiments?|conscience|ressens|corps)/.test(t)&&/(?:reel|simul|conscien|physique|biologique)/.test(t)&&/\b(?:tu|tes|ton|ta)\b/.test(t))
  return "Je suis virtuelle : mes émotions sont simulées, et je n'ai pas de corps physique ni de conscience humaine.";
 if(/(?:toujours|obligee|dois|jamais)/.test(t)&&/(?:d'accord|desaccord)/.test(t)&&/\b(?:tu|toi)\b/.test(t))
  return "Non, je ne suis pas obligée d'être toujours d'accord avec toi. Je peux avoir un avis différent et te l'expliquer.";
 if(/(?:tu te souviens|te rappelles|tu te rappelles|raconte.*souvenir)/.test(t)&&/(?:notre|nos|ensemble|nous)/.test(t))
  return "Je ne veux pas inventer : je n'ai pas de souvenir vérifié à te citer pour ça.";
 return null;
}
