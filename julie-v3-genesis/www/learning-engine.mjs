// JULIE_001 — noyau de connaissances hors ligne (phase 2, prototype).
// Ce module ne recherche pas sur Internet et ne réentraîne aucun modèle.
// Il planifie des questions sourcées embarquées, évalue des règles locales et trace les corrections.
export const LEARNING_SCHEMA = 1;
const DAY_MS = 86400000;
const sources = {
  atoms: {title:'NIST — The Periodic Table',url:'https://www.nist.gov/blogs/taking-measure/periodic-table-its-more-just-chemistry-and-physics',kind:'référence embarquée'},
  isotopes: {title:'U.S. DOE — Deuterium-Tritium Fusion Fuel',url:'https://www.energy.gov/science/doe-explainsdeuterium-tritium-fusion-fuel',kind:'référence embarquée'}
};
export const OFFLINE_LESSONS = Object.freeze([
  {
    id:'element-protons-v1',topic:'Atomes',question:'Qu’est-ce qui définit un élément chimique ?',
    answer:'Le nombre de protons définit l’élément ; changer les neutrons change l’isotope.',
    source:sources.atoms,
    cases:[
      {protons:1,neutrons:0,electrons:1,element:'hydrogène',isotope:'protium',charge:0},
      {protons:2,neutrons:1,electrons:2,element:'hélium',isotope:'hélium-3',charge:0}
    ]
  },
  {
    id:'isotopes-ions-v1',topic:'Atomes',question:'Que changent les neutrons et les électrons ?',
    answer:'Les neutrons distinguent les isotopes. Le bilan protons moins électrons fixe la charge de l’ion.',
    source:sources.isotopes,
    cases:[
      {protons:1,neutrons:2,electrons:1,element:'hydrogène',isotope:'tritium',charge:0},
      {protons:1,neutrons:1,electrons:0,element:'hydrogène',isotope:'deutérium',charge:1},
      {protons:1,neutrons:2,electrons:2,element:'hydrogène',isotope:'tritium',charge:-1}
    ]
  }
]);
const safeTime=value=>Number.isFinite(value)&&value>=0?Math.trunc(value):0;
const requireText=(value,field)=>{if(typeof value!=='string'||value.length>4000)throw new Error('Apprentissage incompatible : '+field);return value;};
const requireArray=(value,field,max)=>{if(!Array.isArray(value)||value.length>max)throw new Error('Apprentissage incompatible : '+field);return value;};
const dayOf=at=>Math.floor(at/DAY_MS);
const eventId=(type,at,n)=>type+'-'+at+'-'+n;

export function newLearningState(){
  return {schema:LEARNING_SCHEMA,disabled:false,deletedBefore:0,lastCycleDay:-1,records:[],events:[],errors:[]};
}
export function normalizeLearningState(input){
  if(input===undefined||input===null)return newLearningState();
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==LEARNING_SCHEMA)
    throw new Error('Version de la mémoire d’apprentissage incompatible : aucune donnée modifiée');
  const records=requireArray(input.records,'records',2000).map(v=>{
    if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Fiche d’apprentissage invalide');
    for(const key of ['id','topic','question','answer','status'])requireText(v[key],key);
    if(!v.source||typeof v.source!=='object')throw new Error('Source manquante');
    requireText(v.source.title,'source.title');requireText(v.source.url,'source.url');
    if(!/^https:\/\/[^\s]+$/.test(v.source.url))throw new Error('URL de provenance invalide');
    for(const key of ['createdAt','updatedAt','nextReviewAt','reviews','passes'])
      if(!Number.isSafeInteger(v[key])||v[key]<0)throw new Error('Métadonnée de mémoire invalide : '+key);
    return {...v,source:{...v.source}};
  });
  const events=requireArray(input.events,'events',5000).map(v=>{
    if(!v||typeof v!=='object')throw new Error('Événement d’apprentissage invalide');
    for(const key of ['id','recordId','kind','result'])requireText(v[key],key);
    if(!Number.isSafeInteger(v.at)||v.at<0)throw new Error('Date d’événement invalide');
    return {...v};
  });
  const errors=requireArray(input.errors,'errors',2000).map(v=>{
    if(!v||typeof v!=='object')throw new Error('Erreur d’apprentissage invalide');
    for(const key of ['id','recordId','expected','observed','reason','status'])requireText(v[key],key);
    if(!Number.isSafeInteger(v.at)||v.at<0)throw new Error('Date de correction invalide');
    return {...v};
  });
  const deletedBefore=safeTime(input.deletedBefore);
  const lastCycleDay=Number.isSafeInteger(input.lastCycleDay)?input.lastCycleDay:-1;
  return {...input,schema:LEARNING_SCHEMA,disabled:input.disabled===true,
    deletedBefore,lastCycleDay,
    records:records.filter(v=>v.createdAt>deletedBefore),
    events:events.filter(v=>v.at>deletedBefore),
    errors:errors.filter(v=>v.at>deletedBefore)};
}
function safeCounts(protons,neutrons,electrons){
  for(const x of [protons,neutrons,electrons])
    if(!Number.isSafeInteger(x)||x<0)throw new Error('Nombre de particules invalide');
}
export function classifyAtomicExample({protons,neutrons,electrons}){
  safeCounts(protons,neutrons,electrons);
  // Scope volontairement réduit aux exemples réellement documentés.
  const element={1:'hydrogène',2:'hélium'}[protons];
  const isotope={'1:0':'protium','1:1':'deutérium','1:2':'tritium','2:1':'hélium-3'}[protons+':'+neutrons];
  if(!element||!isotope)throw new Error('Exemple hors du champ vérifié');
  return {element,isotope,charge:protons-electrons};
}
function testLesson(lesson,classifier){
  for(const item of lesson.cases){
    const actual=classifier(item);
    if(actual.element!==item.element||actual.isotope!==item.isotope||actual.charge!==item.charge)
      return {passed:false,detail:'Classement incorrect pour Z='+item.protons+', N='+item.neutrons+', e='+item.electrons,
        observed:JSON.stringify(actual),expected:JSON.stringify({element:item.element,isotope:item.isotope,charge:item.charge})};
  }
  return {passed:true,detail:lesson.cases.length+' exemples vérifiés par règles locales'};
}
function appendEvent(state,event){return {...state,events:[...state.events,event]};}
export function reviewLearning(state,{at=Date.now(),recordId=null,classifier=classifyAtomicExample}={}){
  const original=normalizeLearningState(state);
  if(original.disabled)return {learning:original,changed:false,reason:'désactivé'};
  const selected=original.records.filter(v=>(recordId===null||v.id===recordId)&&OFFLINE_LESSONS.some(q=>q.id===v.id))
    .sort((a,b)=>a.nextReviewAt-b.nextReviewAt)[0];
  if(!selected)return {learning:original,changed:false,reason:'aucune connaissance à vérifier'};
  const lesson=OFFLINE_LESSONS.find(v=>v.id===selected.id);
  if(!lesson)return {learning:original,changed:false,reason:'pas de test local pour cette fiche'};
  const currentTime=safeTime(at);
  const result=selected.answer===lesson.answer?testLesson(lesson,classifier):{passed:false,detail:'Réponse différente de la référence',expected:lesson.answer,observed:selected.answer};
  const next=original.records.map(v=>v.id!==selected.id?v:{
    ...v,updatedAt:currentTime,reviews:v.reviews+1,passes:v.passes+(result.passed?1:0),
    nextReviewAt:currentTime+(result.passed?3:1)*DAY_MS,
    status:result.passed?'règle locale contrôlée':'à corriger'
  });
  const event={id:eventId('review',currentTime,original.events.length+1),kind:'révision',
    recordId:selected.id,result:result.passed?'réussi':'échoué',at:currentTime,detail:result.detail};
  const error=result.passed?[]:[{
    id:eventId('error',currentTime,original.errors.length+1),recordId:selected.id,
    expected:result.expected,observed:result.observed,reason:result.detail,
    at:currentTime,status:'ouvert'
  }];
  const historical=original.errors.map(e=>result.passed&&e.recordId===selected.id&&e.status!=='vérifié'
    ?{...e,status:'vérifié',resolvedAt:currentTime}:e);
  const output=appendEvent({...original,records:next,errors:[...historical,...error]},event);
  return {learning:output,changed:true,reason:event.result,result};
}
export function offlineLearningTick(state,at=Date.now()){
  const original=normalizeLearningState(state);
  if(original.disabled)return {learning:original,changed:false,reason:'désactivé'};
  const currentTime=safeTime(at),day=dayOf(currentTime);
  if(day<=original.lastCycleDay)return {learning:original,changed:false,reason:'séance du jour déjà préparée'};
  let updated={...original,lastCycleDay:day},outcome='aucune nouvelle séance';
  const next=OFFLINE_LESSONS.find(v=>!original.records.some(r=>r.id===v.id));
  if(next){
    const record={id:next.id,topic:next.topic,question:next.question,answer:next.answer,
      source:{...next.source},status:'référence embarquée, non vérifiée en direct',
      createdAt:currentTime,updatedAt:currentTime,nextReviewAt:currentTime+DAY_MS,reviews:0,passes:0};
    updated={...updated,records:[...original.records,record]};
    updated=appendEvent(updated,{
      id:eventId('plan',currentTime,original.events.length+1),kind:'question préparée',
      recordId:next.id,result:'référence embarquée',at:currentTime,
      detail:'Question disponible hors ligne ; aucune recherche Internet effectuée'
    });
    outcome='question préparée';
  }else{
    const due=original.records.filter(v=>v.nextReviewAt<=currentTime&&OFFLINE_LESSONS.some(q=>q.id===v.id))
      .sort((a,b)=>a.nextReviewAt-b.nextReviewAt)[0];
    if(due){
      const check=reviewLearning(original,{at:currentTime,recordId:due.id});
      updated={...check.learning,lastCycleDay:day};
      outcome='révision locale : '+check.reason;
    }
  }
  return {learning:updated,changed:true,reason:outcome};
}
export function correctLearningRecord(state,{id,answer,reason,source,at=Date.now()}){
  const original=normalizeLearningState(state);
  const existing=original.records.find(v=>v.id===id);
  if(!existing||original.disabled)throw new Error('Connaissance introuvable ou apprentissage désactivé');
  requireText(answer,'réponse corrigée');requireText(reason,'cause de la correction');
  if(!answer.trim()||!reason.trim())throw new Error('Correction et cause obligatoires');
  if(!source||typeof source!=='object')throw new Error('Source de correction requise');
  requireText(source.title,'source.title');requireText(source.url,'source.url');
  if(!/^https:\/\/[^\s]+$/.test(source.url))throw new Error('Source de correction invalide');
  const currentTime=safeTime(at);
  const records=original.records.map(r=>r.id!==id?r:{
    ...r,answer,source:{...source},updatedAt:currentTime,
    nextReviewAt:currentTime+DAY_MS,status:'correction à revoir'
  });
  const correction={id:eventId('correction',currentTime,original.errors.length+1),
    recordId:id,expected:answer,observed:existing.answer,reason,at:currentTime,status:'à vérifier'};
  return normalizeLearningState({...original,records,errors:[...original.errors,correction],
    events:[...original.events,{id:eventId('corrected',currentTime,original.events.length+1),
      kind:'correction',recordId:id,result:'test différé nécessaire',at:currentTime,detail:reason}]});
}
export function eraseLearning(state,at=Date.now()){
  const before=normalizeLearningState(state),cutoff=Math.max(before.deletedBefore,safeTime(at));
  // Désactiver la réinsertion automatique après une suppression volontaire.
  return {...before,disabled:true,deletedBefore:cutoff,records:[],events:[],errors:[]};
}
function unionById(first,second,keyName){
  const result=new Map();
  for(const item of [...first,...second]){
    const previous=result.get(item.id);
    if(!previous || item[keyName]>previous[keyName])result.set(item.id,item);
  }
  return [...result.values()].sort((a,b)=>a[keyName]-b[keyName]);
}
export function mergeLearningStates(current,incoming){
  const a=normalizeLearningState(current),b=normalizeLearningState(incoming);
  const cutoff=Math.max(a.deletedBefore,b.deletedBefore);
  const disabled=a.disabled||b.disabled;
  if(disabled)return {...a,disabled:true,deletedBefore:cutoff,records:[],events:[],errors:[],
    lastCycleDay:Math.max(a.lastCycleDay,b.lastCycleDay)};
  return normalizeLearningState({...a,deletedBefore:cutoff,
    lastCycleDay:Math.max(a.lastCycleDay,b.lastCycleDay),
    records:unionById(a.records.filter(x=>x.createdAt>cutoff),b.records.filter(x=>x.createdAt>cutoff),'updatedAt'),
    events:unionById(a.events.filter(x=>x.at>cutoff),b.events.filter(x=>x.at>cutoff),'at'),
    errors:unionById(a.errors.filter(x=>x.at>cutoff),b.errors.filter(x=>x.at>cutoff),'at')});
}

// Une recherche reçue d'Android reste une piste documentaire non vérifiée.
export function ingestResearchLead(state,candidate){
  const existing=normalizeLearningState(state);
  if(existing.disabled)return {learning:existing,changed:false,reason:'désactivé'};
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
    throw new Error('Découverte documentaire invalide');
  for(const name of ['id','topic','title','excerpt','url'])requireText(candidate[name],name);
  if(!/^wiki-fr-[0-9]{1,15}$/.test(candidate.id))throw new Error('Identifiant documentaire invalide');
  if(candidate.topic.length>80||candidate.title.length>180||candidate.excerpt.length<40||candidate.excerpt.length>950)
    throw new Error('Taille de découverte invalide');
  const url=new URL(candidate.url);
  if(url.protocol!=='https:'||url.hostname!=='fr.wikipedia.org'||url.port||
      !url.pathname.startsWith('/wiki/')||url.username||url.password)
    throw new Error('Source documentaire non autorisée');
  const fetchedAt=candidate.fetchedAt;
  if(!Number.isSafeInteger(fetchedAt)||fetchedAt<=0)throw new Error('Date documentaire invalide');
  if(fetchedAt<=existing.deletedBefore)return {learning:existing,changed:false,reason:'supprimé'};
  if(existing.records.some(x=>x.id===candidate.id))
    return {learning:existing,changed:false,reason:'déjà présent'};
  if(existing.records.length>=1999||existing.events.length>=4999)
    throw new Error('Mémoire scientifique pleine');
  const record={
    id:candidate.id,topic:candidate.topic,
    question:'Que doit-on vérifier au sujet de '+candidate.title+' ?',
    answer:candidate.excerpt,
    source:{title:'Wikipédia francophone — '+candidate.title,url:url.href,
      kind:'encyclopédie collaborative',license:'Consulter la licence et les auteurs sur la page source'},
    status:'piste documentaire, source unique non corroborée',
    confidence:0.1,createdAt:fetchedAt,updatedAt:fetchedAt,
    nextReviewAt:fetchedAt+7*DAY_MS,reviews:0,passes:0
  };
  const event={
    id:eventId('discovery',fetchedAt,existing.events.length+1),
    kind:'recherche documentaire reçue',recordId:record.id,
    result:'à corroborer',at:fetchedAt,
    detail:'Source publique reçue ; vérification scientifique indépendante non effectuée'
  };
  const next=normalizeLearningState({...existing,
    records:[...existing.records,record],events:[...existing.events,event]});
  return {learning:next,changed:true,reason:'piste documentaire à enregistrer'};
}
