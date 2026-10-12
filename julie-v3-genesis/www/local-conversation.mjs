import {verifiedRules} from './documentary-memory.mjs';
export const ENGINE_MODE='Modèle local Qwen2.5 1.5B expérimental, avec fiche vérifiée';
const clean=t=>String(t).replace(/<\|[^>]*\|>/g,'').slice(0,2400);
const facts='Fiche SCI-003 : isotopes = même Z et N différents ; isobares = même A et Z différents ; A = Z + N ; charge q = Z - e en charges élémentaires.';
export function buildPrompt(messages,text,hasRules=false){
  const system='Tu es Julie, compagne virtuelle adulte d’Amaury. Parle français naturellement et brièvement. Ne prétends jamais avoir effectué une action, accédé à Internet ou enregistré une information. Tes émotions sont simulées. Si tu ignores une réponse, dis-le. Réponds en trois phrases maximum. '+
    (hasRules?facts:'Aucune fiche documentaire vérifiée fournie pour cet échange.');
  const history=messages.slice(-4).map(m=>'<|im_start|>'+(m.role==='user'?'user':'assistant')+'\n'+clean(m.text).slice(0,400)+'<|im_end|>\n').join('');
  return '<|im_start|>system\n'+system+'<|im_end|>\n'+history+'<|im_start|>user\n'+clean(text)+'<|im_end|>\n<|im_start|>assistant\n';
}
export function engineAvailable(bridge=globalThis.window?.JulieLocal){
  return !!bridge?.available?.();
}
export async function generateLocal(prompt,bridge=globalThis.window?.JulieLocal){
  if(!engineAvailable(bridge))throw new Error('Le moteur local n’est pas disponible.');
  await new Promise(resolve=>setTimeout(resolve,30));
  const result=JSON.parse(bridge.generate(prompt));
  if(result.error)throw new Error(result.error);
  if(typeof result.text!=='string'||!result.text.trim())throw new Error('Réponse locale vide');
  return result.text.trim();
}
export async function localReply(state,text){
  if(text.length>2400)throw new Error('Message trop long pour ce moteur : limite de 2 400 caractères.');
  const rules=state.learning.disabled?null:await verifiedRules(state.learning.documentary);
  const reply=await generateLocal(buildPrompt(state.messages,text,!!rules));
  return reply+(rules&&/isotop|isobar|masse|charge|neutron|proton/i.test(text)?'\nSource documentaire fournie au modèle : '+rules.source:'');
}
export async function localExamRespond(question,rules){
  const text=question.prompt+'\nRéponds uniquement par '+(['masse','charge'].includes(question.skill)?'un nombre entier.':'vrai ou faux.');
  const reply=await generateLocal(buildPrompt([],text,!!rules));
  const value=reply.trim().replace(/[.!]$/,'').trim().toLowerCase();
  if(value==='vrai'||value==='true')return true;
  if(value==='faux'||value==='false')return false;
  return /^-?\d+$/.test(value)?Number(value):null;
}
