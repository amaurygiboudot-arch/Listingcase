import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLearning,captureLearning,dailyLearnings,isDailyLearningQuestion,replyDailyLearning,LEARNING_MAX} from '../www/learning-journal.mjs';
import {createInitialState,parseJulieState,eraseDemoHistory,mergeImport,appendConversation} from '../www/state-store.mjs';

test('Les déclarations explicites sont enregistrées, pas les questions ni les suppositions',()=>{
  assert.equal(extractLearning('Peux-tu me parler de Paris ?',100),null);
  assert.equal(extractLearning('Salut Julie',100),null);
  const a=extractLearning("Je travaille de cinq heures à treize heures",100);
  assert.equal(a.kind,'déclaration utilisateur');
  assert.equal(a.source,'message utilisateur');
  assert.equal(a.verified,false);
  assert.equal(extractLearning("Tu te trompes, je finis à midi.",101).kind,'correction utilisateur');
});
test('Apprentissage sans duplication ni suppression silencieuse des autres données',()=>{
  const initial=createInitialState(0);
  const first=captureLearning(initial,"Je travaille de cinq heures à treize heures",100);
  assert.equal(first.learning.length,1);
  assert.equal(captureLearning(first,"Je travaille de cinq heures à treize heures",200).learning.length,1);
  assert.deepEqual(first.memories,initial.memories);
  assert.deepEqual(first.messages,initial.messages);
  assert.equal(captureLearning({...first,learning:Array(LEARNING_MAX).fill(first.learning[0])},"Je veux faire du vélo",300).learning.length,LEARNING_MAX);
});
test('Bilan quotidien fondé uniquement sur les apprentissages enregistrés',()=>{
  const now=Date.UTC(2026,9,12,12);
  const state={learning:[extractLearning('Je veux apprendre Blender',now),
    extractLearning('Je préfère le thé',now-86_400_000)],
    research:[{title:'Source scientifique',url:'https://example.org/a',at:now,kind:'information recherchée'}]};
  const daily=dailyLearnings(state,now,120);
  assert.equal(daily.date,'2026-10-12');
  assert.equal(daily.learned.length,1);
  assert.equal(daily.sources.length,1);
  const answer=replyDailyLearning(state,now,120);
  assert.match(answer,/Blender/);
  assert.match(answer,/Source scientifique/);
  assert.doesNotMatch(answer,/thé/);
  assert.equal(isDailyLearningQuestion("Julie, qu'as-tu appris aujourd'hui ?"),true);
  assert.equal(isDailyLearningQuestion("Qu'as-tu appris aujourd'hui ?"),true);
  assert.match(replyDailyLearning({},now,120),/aucun nouvel apprentissage/);
});
test('Archive, import et effacement du journal respectent le droit à suppression',()=>{
  let state=createInitialState(1);
  state=appendConversation(state,'Je travaille à la maison','Je note',100);
  assert.equal(state.learning.length,1);
  const reconstructed=parseJulieState(JSON.stringify(state));
  assert.equal(reconstructed.learning.length,1);
  const cleared=eraseDemoHistory(reconstructed,1000);
  assert.equal(cleared.learning.length,0);
  assert.equal(mergeImport(cleared,reconstructed).state.learning.length,0);
  assert.equal(mergeImport(createInitialState(1),reconstructed).state.learning.length,1);
  const legacy=createInitialState(1);delete legacy.learning;
  assert.deepEqual(parseJulieState(legacy).learning,[]);
});
