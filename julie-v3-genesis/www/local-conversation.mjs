import {profileReply} from './dialogue-profile.mjs';
import {DIALOGUE_SYSTEM,DIALOGUE_EXAMPLES,dialogueContext} from './dialogue-context.mjs';
import {verifiedRules} from './documentary-memory.mjs';
export const ENGINE_MODE='Modèle local Qwen2.5 1.5B expérimental, avec fiche vérifiée';
const clean=t=>String(t).replace(/<\|[^>]*\|>/g,'').slice(0,2400);
const facts='Fiche SCI-003 : isotopes = même Z et N différents ; isobares = même A et Z différents ; A = Z + N ; charge q = Z - e en charges élémentaires.';
export function buildPrompt(messages,text,hasRules=false,exam=false){
  const turn=(role,t)=>'<|im_start|>'+role+'\n'+clean(t)+'<|im_end|>\n';
  const system=exam ? 'Réponds en français uniquement au format demandé. Ne joue aucun rôle romantique. N’invente pas de résultat.' : DIALOGUE_SYSTEM;
  const examples=exam?'':DIALOGUE_EXAMPLES.map(([role,t])=>turn(role,t)).join('');
  const history=(exam?[]:dialogueContext(messages)).map(m=>turn(m.role==='user'?'user':'assistant',clean(m.text).slice(0,160))).join('');
  return turn('system',system+(hasRules?' '+facts:''))+examples+history+turn('user',text)+'<|im_start|>assistant\n';
}
export function engineAvailable(bridge=globalThis.window?.JulieLocal){
  return !!bridge?.available?.();
}
export async function generateLocal(prompt,bridge=globalThis.window?.JulieLocal){
  if(!engineAvailable(bridge))throw new Error('Le moteur local n’est pas disponible.');
  await new Promise(resolve=>setTimeout(resolve,30));
  let result;
  if(typeof bridge.start==='function'){
    const id=bridge.start(prompt);
    if(!id)throw new Error('Le moteur est déjà occupé ou indisponible.');
    const deadline=Date.now()+120000;
    let previous='';
    for(;;){
      result=JSON.parse(bridge.poll(id));
      if(result.text&&result.text!==previous){
        previous=result.text;
        globalThis.document?.dispatchEvent(new CustomEvent('julie-token',{detail:{text:previous}}));
      }
      if(result.done)break;
      if(Date.now()>deadline)throw new Error('Temps de réponse dépassé.');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  }else{result=JSON.parse(bridge.generate(prompt));}
  if(result.error)throw new Error(result.error);
  if(typeof result.text!=='string'||!result.text.trim())throw new Error('Réponse locale vide');
  return result.text.trim();
}
export function needsScienceContext(messages,text){
  return /isotop|isobar|masse|charge|neutron|proton|nucléon|nucleon|électron|electron|\b[ZNA]\s*=/i.test(text+' '+messages.slice(-2).filter(m=>m.role==='user').map(m=>m.text).join(' '));
}
export async function localReply(state,text){
  const profile=profileReply(text);
  if(profile)return profile;
  if(text.length>2400)throw new Error('Message trop long pour ce moteur : limite de 2 400 caractères.');
  const rules=state.learning.disabled||!needsScienceContext(state.messages,text)?null:await verifiedRules(state.learning.documentary);
  const reply=await generateLocal(buildPrompt(state.messages,text,!!rules));
  return reply+(rules&&/isotop|isobar|masse|charge|neutron|proton/i.test(text)?'\nSource documentaire fournie au modèle : '+rules.source:'');
}
export async function localExamRespond(question,rules){
  const text=question.prompt+'\nRéponds uniquement par '+(['masse','charge'].includes(question.skill)?'un nombre entier.':'vrai ou faux.');
  const reply=await generateLocal(buildPrompt([],text,!!rules,true));
  const value=reply.trim().replace(/[.!]$/,'').trim().toLowerCase();
  if(value==='vrai'||value==='true')return true;
  if(value==='faux'||value==='false')return false;
  return /^-?\d+$/.test(value)?Number(value):null;
}
