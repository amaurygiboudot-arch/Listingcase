import {runSurpriseExam} from './exam-engine.mjs';
import {appendConversation} from './state-store.mjs';
export const frenchAnswer=value=>value===true?'vrai':value===false?'faux':String(value??'abstention');
export function isExamRequest(text){
  const t=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  return /^(?:(?:julie[, ]+)?(?:lance|fais|passe|commence)(?:-moi)?\s+(?:un |le )?)?(?:controle surprise|examen surprise|controle|examen)[.!?\s]*$/.test(t);
}
export async function examConversation(state,text,options={}){
  if(!isExamRequest(text))return null;
  if(state.learning.disabled)throw new Error('Apprentissage désactivé : aucun contrôle lancé.');
  const result=await runSurpriseExam(state.learning.documentary,options);
  const a=result.attempt;
  const lines=['Contrôle surprise — '+a.score+'/20',
    'Je réponds à quatre questions sur la fiche SCI-003. Réponses locales, sans modèle IA général.'];
  a.items.forEach((q,i)=>lines.push(
    (i+1)+'. '+q.prompt,
    'Ma réponse : '+frenchAnswer(q.observed)+'.',
    'Corrigé : '+frenchAnswer(q.expected)+'. '+q.explanation+' '+q.points+'/5.'));
  lines.push('Source : '+a.source,'Résultat conservé dans cet échange et dans l’historique des contrôles.');
  return appendConversation({...state,learning:{...state.learning,documentary:result.state}},
    text,lines.join('\n'),a.at);
}
