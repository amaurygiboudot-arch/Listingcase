import {latestVersion,revisionQueue,learningPriorities} from './documentary-memory.mjs';
import {runSurpriseExam} from './exam-engine.mjs';
export function mountLearningExams({getState,persist,isHealthy}){
  const $=id=>document.getElementById(id);
  if(!$('learning-exams'))return;
  let busy=false,problem='';
  function render(){
    const s=getState(),d=s.learning.documentary,v=latestVersion(d);
    const disabled=busy||s.learning.disabled||!isHealthy()||!v;
    $('exam-surprise').disabled=disabled;
    const revisions=revisionQueue(d);
    $('exam-revise').disabled=disabled||!revisions.some(r=>r.due);
    $('exam-status').textContent=problem||(s.learning.disabled?'Apprentissage effacé et désactivé.':!v?'Aucune fiche disponible.':v.title+' · '+v.status);
    $('exam-revisions').textContent=revisions.map(r=>'J+'+r.day+' : '+(r.completed?'effectuée':new Date(r.dueAt).toLocaleDateString('fr-FR')+(r.due?' — à faire':''))).join(' · ');
    const root=$('exam-results');root.textContent='';
    const priorities=learningPriorities(d);
    if(priorities.length){const p=document.createElement('p');p.textContent='À retravailler : '+priorities.map(x=>x.skill+' ('+x.errors+')').join(', ');root.append(p);}
    for(const attempt of [...d.attempts].reverse()){
      const details=document.createElement('details'),summary=document.createElement('summary');
      summary.textContent=new Date(attempt.at).toLocaleString('fr-FR')+' — '+attempt.score+'/20'+(attempt.reviewDay?' · J+'+attempt.reviewDay:' · surprise');details.append(summary);
      for(const item of attempt.items){const p=document.createElement('p');p.textContent=item.prompt+' Réponse JULIE : '+String(item.observed??'abstention')+'. Corrigé : '+String(item.expected)+'. '+item.explanation+' '+item.points+'/5.';details.append(p);}
      const p=document.createElement('p');p.textContent=attempt.mode+' · Source : '+attempt.source;details.append(p);root.append(details);
    }
  }
  async function run(review){
    if(busy||!isHealthy()||getState().learning.disabled)return;
    busy=true;problem='';render();
    const baseline=JSON.stringify(getState().learning);
    try{
      const result=await runSurpriseExam(getState().learning.documentary,{review});
      if(JSON.stringify(getState().learning)!==baseline)throw new Error('Mémoire modifiée pendant le contrôle ; résultat non enregistré, relancer.');
      const s=getState();
      if(!persist({...s,learning:{...s.learning,documentary:result.state}}))throw new Error('Résultat non sauvegardé');
    }catch(e){problem=e.message;}
    finally{busy=false;render();}
  }
  $('exam-surprise').addEventListener('click',()=>run(false));
  $('exam-revise').addEventListener('click',()=>run(true));
  document.addEventListener('julie-learning-changed',render);
  render();
}
