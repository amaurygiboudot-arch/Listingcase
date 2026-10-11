import {normalizeDocumentary,verifiedRules,revisionQueue,learningPriorities} from './documentary-memory.mjs';
import {answerExamQuestion} from './exam-respondent.mjs';
// Génération depuis une réponse tirée d'abord, distincte du calcul du répondant.
function makeQuestion(skill,draw){
  const pick=n=>Math.floor(draw()*n),z=2+pick(18),n=2+pick(20);
  if(skill==='masse'){
    const expected=z+n;
    return {skill,prompt:`Z=${z}, N=${n} : quel est le nombre de masse A ?`,specimens:[{z:expected-n,n}],expected,explanation:`A = Z + N = ${expected}.`};
  }
  if(skill==='charge'){
    const expected=pick(5)-2;
    return {skill,prompt:`Z=${z}, e=${z-expected} : quelle est la charge q ?`,specimens:[{z,e:z-expected}],expected,explanation:`q = Z − e = ${expected}.`};
  }
  const expected=pick(2)===1;
  const a={z,n},b=skill==='isotopes'?{z:expected?z:z+1,n:n+1}:{z:z+1,n:expected?n-1:n};
  return {skill,prompt:`A(Z=${a.z},N=${a.n}) et B(Z=${b.z},N=${b.n}) sont-ils ${skill} ?`,
    specimens:[a,b],expected,explanation:skill==='isotopes'?'Isotopes : même Z et N différents.':'Isobares : même A et Z différents.'};
}
export function createExam({draw=Math.random,priorities=[]}={}){
  const skills=['masse','charge','isotopes','isobares'];
  const rank=s=>priorities.includes(s)?priorities.indexOf(s):priorities.length;
  skills.sort((a,b)=>rank(a)-rank(b));
  return skills.map(skill=>makeQuestion(skill,draw));
}
export function gradeExam(exam,responses){
  if(exam.length!==4||responses.length!==4)throw new Error('Épreuve incomplète');
  const items=exam.map((q,i)=>({...q,observed:responses[i],passed:responses[i]===q.expected,points:responses[i]===q.expected?5:0}));
  return {items,score:items.reduce((n,i)=>n+i.points,0)};
}
export async function runSurpriseExam(input,{at=Date.now(),draw=Math.random,respond=answerExamQuestion,review=false}={}){
  const before=normalizeDocumentary(input),rules=await verifiedRules(before);
  if(!rules)throw new Error('Aucune version documentaire vérifiée disponible ; examen non lancé');
  const exam=createExam({draw,priorities:learningPriorities(before).map(p=>p.skill)});
  const responses=[];
  for(const q of exam){
    // Aucun corrigé, explication ou score transmis au répondant.
    const publicQuestion={skill:q.skill,prompt:q.prompt,specimens:structuredClone(q.specimens)};
    try{const r=await respond(publicQuestion,structuredClone(rules));responses.push(typeof r==='number'&&Number.isFinite(r)||typeof r==='boolean'?r:null);}
    catch{responses.push(null);}
  }
  const result=gradeExam(exam,responses);
  const due=review?revisionQueue(before,at).find(r=>r.due):null;
  const attempt={id:crypto.randomUUID(),at,versionId:rules.versionId,source:rules.source,
    mode:'récupération documentaire et règles locales ; sans modèle IA',reviewDay:due?.day||null,...result};
  return {state:normalizeDocumentary({...before,attempts:[...before.attempts,attempt]}),attempt};
}
