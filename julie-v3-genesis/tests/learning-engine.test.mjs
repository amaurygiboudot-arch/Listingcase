import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newLearningState,normalizeLearningState,OFFLINE_LESSONS,
  offlineLearningTick,reviewLearning,classifyAtomicExample,
  correctLearningRecord,eraseLearning,mergeLearningStates
} from '../www/learning-engine.mjs';
import {JULIE_ID,createInitialState,parseJulieState,mergeImport,appendConversation} from '../www/state-store.mjs';

const DAY=86400000;
const T=Date.UTC(2026,9,10,12);

test('Une ancienne mémoire JULIE_001 migre sans perdre ses messages',()=>{
  const old={id:JULIE_ID,messages:[{role:'user',text:'Bonjour',at:T}],memories:[],firstOpened:T};
  const parsed=parseJulieState(old);
  assert.equal(parsed.schemaVersion,2);
  assert.equal(parsed.messages.length,1);
  assert.equal(parsed.learning.schema,1);
  assert.deepEqual(parsed.learning.records,[]);
});

test('La séance quotidienne prépare des questions sourcées sans prétendre faire de recherche',()=>{
  const s0=newLearningState();
  const first=offlineLearningTick(s0,T);
  assert.equal(first.changed,true);
  assert.equal(first.reason,'question préparée');
  assert.equal(first.learning.records.length,1);
  assert.equal(first.learning.records[0].id,OFFLINE_LESSONS[0].id);
  assert.match(first.learning.records[0].status,/référence embarquée/);
  assert.match(first.learning.events[0].detail,/aucune recherche Internet/);
  assert.equal(offlineLearningTick(first.learning,T+10).changed,false);
  const second=offlineLearningTick(first.learning,T+DAY);
  assert.equal(second.learning.records.length,2);
  const third=offlineLearningTick(second.learning,T+2*DAY);
  assert.match(third.reason,/révision locale/);
  assert.equal(third.learning.records.length,2);
  assert.equal(third.learning.events.length,3);
});

test('Les règles vérifient isotope, élément et charge sans connaissance externe',()=>{
  assert.deepEqual(classifyAtomicExample({protons:1,neutrons:2,electrons:0}),
    {element:'hydrogène',isotope:'tritium',charge:1});
  assert.deepEqual(classifyAtomicExample({protons:2,neutrons:1,electrons:2}),
    {element:'hélium',isotope:'hélium-3',charge:0});
  assert.throws(()=>classifyAtomicExample({protons:6,neutrons:6,electrons:6}),/hors du champ/);
});

test('Échec observé puis correction du comportement contrôlé ; erreur conservée',()=>{
  let knowledge=offlineLearningTick(newLearningState(),T).learning;
  const faulty=()=>({element:'hélium',isotope:'tritium',charge:0});
  const failed=reviewLearning(knowledge,{at:T+10,recordId:'element-protons-v1',classifier:faulty});
  assert.equal(failed.result.passed,false);
  assert.equal(failed.learning.errors.length,1);
  assert.equal(failed.learning.errors[0].status,'ouvert');
  assert.equal(failed.learning.records[0].status,'à corriger');
  const fixed=reviewLearning(failed.learning,{at:T+100,recordId:'element-protons-v1'});
  assert.equal(fixed.result.passed,true);
  assert.equal(fixed.learning.errors[0].status,'vérifié');
  assert.equal(fixed.learning.records[0].reviews,2);
  assert.equal(fixed.learning.records[0].passes,1);
});

test('Une mauvaise correction textuelle ne peut pas être validée par un simple test de règles',()=>{
  let knowledge=offlineLearningTick(newLearningState(),T).learning;
  const wrong=correctLearningRecord(knowledge,{
    id:'element-protons-v1',answer:'Les électrons définissent l’élément',
    reason:'Hypothèse de test volontairement incorrecte',
    source:{title:'Exemple local de test',url:'https://example.org/revision'},at:T+100
  });
  const rejected=reviewLearning(wrong,{at:T+200});
  assert.equal(rejected.result.passed,false);
  assert.match(rejected.learning.errors.at(-1).reason,/Réponse différente/);
  const restored=correctLearningRecord(rejected.learning,{
    id:'element-protons-v1',answer:OFFLINE_LESSONS[0].answer,
    reason:'Retour à la source scientifique documentée',
    source:OFFLINE_LESSONS[0].source,at:T+250
  });
  const valid=reviewLearning(restored,{at:T+300});
  assert.equal(valid.result.passed,true);
  assert.equal(valid.learning.errors.every(x=>x.status==='vérifié'),true);
});

test('Suppression définitive : anciennes sauvegardes ne restaurent pas les apprentissages',()=>{
  const old=offlineLearningTick(newLearningState(),T).learning;
  const erased=eraseLearning(old,T+DAY);
  assert.equal(erased.disabled,true);
  assert.equal(erased.records.length,0);
  assert.equal(offlineLearningTick(erased,T+2*DAY).changed,false);
  assert.equal(mergeLearningStates(erased,old).records.length,0);
  assert.equal(mergeLearningStates(old,erased).records.length,0);
  assert.equal(mergeLearningStates(old,erased).disabled,true);
});

test('Import ancien et nouvelle mémoire fusionnent sans effacer les conversations ni ressusciter une suppression',()=>{
  const s=createInitialState(T);
  const populated={...appendConversation(s,'Salut','Bonjour',T+10),
    learning:offlineLearningTick(s.learning,T).learning};
  const backup=JSON.parse(JSON.stringify(populated));
  assert.equal(mergeImport(populated,backup).state.learning.records.length,1);
  const erased={...populated,learning:eraseLearning(populated.learning,T+2*DAY)};
  const merged=mergeImport(erased,backup);
  assert.equal(merged.state.messages.length,2);
  assert.equal(merged.state.learning.disabled,true);
  assert.equal(merged.state.learning.records.length,0);
  assert.equal(mergeImport(backup,erased).state.learning.records.length,0);
});

test('Import corrompu refusé avant toute modification des données initiales',()=>{
  const original=createInitialState(T);
  const invalid=JSON.parse(JSON.stringify(original));
  invalid.learning=offlineLearningTick(invalid.learning,T).learning;
  invalid.learning.records[0].source.url='javascript:alert(1)';
  assert.throws(()=>mergeImport(original,invalid),/provenance invalide/);
  assert.deepEqual(original.learning.records,[]);
  const future=JSON.parse(JSON.stringify(original));future.learning.schema=9;
  assert.throws(()=>parseJulieState(future),/incompatible/);
  assert.deepEqual(normalizeLearningState(null),newLearningState());
});
