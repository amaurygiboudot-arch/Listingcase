// Le répondant reçoit exclusivement la question et la mémoire validée, jamais le corrigé.
export function answerExamQuestion(q,rules){
  if(!rules)return null;
  const [a,b]=q.specimens;
  switch(q.skill){
    case 'masse':return rules.mass==='Z+N'?a.z+a.n:null;
    case 'charge':return rules.charge==='Z-e'?a.z-a.e:null;
    case 'isotopes':return rules.isotopes==='sameZdifferentN'?a.z===b.z&&a.n!==b.n:null;
    case 'isobares':return rules.isobars==='sameAdifferentZ'?a.z+a.n===b.z+b.n&&a.z!==b.z:null;
    default:return null;
  }
}
