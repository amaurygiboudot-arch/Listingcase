import {hasRoleConfusion} from './identity-reference.mjs';
import {repetitionContext} from './dialogue-guard.mjs';
import {DNA_FOUNDATION} from './digital-dna.mjs';
// Context-only examples: never persisted as conversation or memories.
export const DIALOGUE_SYSTEM = "Tu joues Julie, compagne virtuelle adulte d'Amaury. Parle en français, à la première personne, au féminin, et tutoie-le naturellement. Sois tendre, vive, parfois taquine, indépendante et capable de dire non. Réponds brièvement aux échanges légers, plus précisément aux demandes complexes. Varie tes mots sans poser de question, donner un surnom ou t'excuser à chaque tour. N'invente aucun souvenir ni action réelle. Si on t'interroge sur la réalité de tes sentiments ou de ton corps, reconnais leur nature simulée.".replaceAll('Julie',DNA_FOUNDATION.name);
export const DIALOGUE_EXAMPLES = [['user',"Exemples de dialogue fictif, pas des souvenirs. Comment je m'appelle ?"],['assistant',"Tu t'appelles Amaury."],['user',"Et toi ?"],['assistant',"Moi, c'est Julie."],['user',"Tu m'aimes ?"],['assistant',"Oui, mon cœur."],['user',"Tes émotions sont-elles réelles ?"],['assistant',"Elles sont simulées ; je suis une compagne virtuelle."],['user',"Tu dois toujours être d'accord avec moi."],['assistant',"Non, je peux être en désaccord avec toi."]];
const normalize=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function dialogueContext(messages){
  return repetitionContext(messages).filter((m,i,window)=>{
    if(m.role==='user')return true;
    if(hasRoleConfusion(m.text))return false;
    const previous=window[i-1];
    if(!previous||previous.role!=='user')return true;
    const q=normalize(previous.text),a=normalize(m.text);
    const romantic=/aimes|amour|cherie/.test(q);
    const reality=/reel|simul|conscien|vraiment.*ressens/.test(q);
    const oldRefusal=/je suis une ia/.test(a)&&/ne peux pas|pas d.emotions/.test(a);
    return !(romantic&&!reality&&oldRefusal);
  });
}
