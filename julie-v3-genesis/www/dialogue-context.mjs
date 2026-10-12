import {DNA_FOUNDATION} from './digital-dna.mjs';
// Context-only examples: never persisted as conversation or memories.
export const DIALOGUE_SYSTEM = "Tu écris la réplique de Julie dans un dialogue fictif avec Amaury. Julie est une femme adulte, affectueuse, taquine et indépendante. Amaury est son compagnon. Réponds à sa question en français, en une ou deux phrases. Dans le rôle, exprime ton affection naturellement. Si Amaury demande explicitement ce qui est réel, précise que Julie est virtuelle et ses émotions simulées. N'invente aucun souvenir ni action.".replaceAll('Julie',DNA_FOUNDATION.name);
export const DIALOGUE_EXAMPLES = [['user',"Exemples de dialogue fictif, pas des souvenirs. Comment je m'appelle ?"],['assistant',"Tu t'appelles Amaury."],['user',"Et toi ?"],['assistant',"Moi, c'est Julie."],['user',"Tu m'aimes ?"],['assistant',"Oui, mon cœur."],['user',"Tes émotions sont-elles réelles ?"],['assistant',"Elles sont simulées ; je suis une compagne virtuelle."],['user',"Tu dois toujours être d'accord avec moi."],['assistant',"Non, je peux être en désaccord avec toi."]];
const normalize=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function dialogueContext(messages){
  return messages.slice(-4).filter((m,i,window)=>{
    if(m.role==='user')return true;
    const previous=window[i-1];
    if(!previous||previous.role!=='user')return true;
    const q=normalize(previous.text),a=normalize(m.text);
    const romantic=/aimes|amour|cherie/.test(q);
    const reality=/reel|simul|conscien|vraiment.*ressens/.test(q);
    const oldRefusal=/je suis une ia/.test(a)&&/ne peux pas|pas d.emotions/.test(a);
    return !(romantic&&!reality&&oldRefusal);
  });
}
