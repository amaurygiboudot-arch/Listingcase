import test from 'node:test';
import assert from 'node:assert/strict';
import {JULIE_ID,MAX_STATE_BYTES,createInitialState,parseJulieState,mergeImport,eraseDemoHistory,appendConversation,checkCapacity} from '../www/state-store.mjs';

test('Identité permanente et versionnement sans troncature automatique',()=>{
  let s=createInitialState(1000);
  for(let i=0;i<180;i++)s=appendConversation(s,`Bonjour ${i}`,`Coucou ${i}`,2000+i*2);
  assert.equal(s.id,JULIE_ID);
  assert.equal(s.messages.length,360);
  assert.equal(s.schemaVersion,2);
  assert.ok(checkCapacity(s)>0);
  assert.equal(parseJulieState(JSON.stringify(s)).messages.length,360);
});
test('Ancien export importé complètement, sans limiter à 120 messages',()=>{
  const old={id:JULIE_ID,firstOpened:1,quality:'eco',messages:[],memories:[]};
  for(let i=0;i<321;i++)old.messages.push({role:i%2?'julie':'user',text:`Message ${i}`,at:i+1000});
  for(let i=0;i<115;i++)old.memories.push({kind:'déclaration utilisateur',text:`Mémoire ${i}`,at:i+1000});
  const merged=mergeImport(createInitialState(900),old);
  assert.equal(merged.addedMessages,321);assert.equal(merged.addedMemories,115);
  assert.equal(merged.state.messages.length,321);assert.equal(merged.state.memories.length,115);
  assert.equal(mergeImport(merged.state,old).addedMessages,0);
});
test('Effacement protégé contre une ancienne restauration',()=>{
  const prior=appendConversation(createInitialState(100),"j'aime Julie",'Coucou',120);
  const erased=eraseDemoHistory(prior,1000);
  assert.equal(erased.messages.length,0);assert.equal(erased.memories.length,0);
  assert.equal(erased.deletedBefore,1000);
  const merged=mergeImport(erased,prior);
  assert.equal(merged.state.messages.length,0);
  assert.equal(merged.state.memories.length,0);
  assert.equal(merged.blocked,3);
  const newer=appendConversation(erased,'Salut','Bonjour',1100);
  assert.equal(mergeImport(newer,prior).state.messages.length,2);
});
test('Une suppression issue d\'un autre export se propage sans résurrection',()=>{
  const before=appendConversation(createInitialState(100),'Salut','Bonjour',120);
  const deletedElsewhere=eraseDemoHistory(before,1000);
  const result=mergeImport(before,deletedElsewhere);
  assert.equal(result.state.id,JULIE_ID);
  assert.equal(result.state.deletedBefore,1000);
  assert.equal(result.state.messages.length,0);
  assert.equal(result.removedMessages,2);
  assert.equal(result.removedMemories,0);
  assert.equal(mergeImport(result.state,before).state.messages.length,0);
  const later=appendConversation(result.state,'Nouveau','Coucou',2000);
  assert.equal(mergeImport(later,before).state.messages.length,2);
});
test('Données invalides : aucune importation partielle',()=>{
  const state=createInitialState(10);
  assert.throws(()=>mergeImport(state,{id:'EVE_001',messages:[],memories:[]}));
  assert.throws(()=>mergeImport(state,{id:JULIE_ID,messages:[{role:'user',text:14,at:1}],memories:[]}));
  assert.equal(state.messages.length,0);
});
test('Plein stockage : erreur et données conservées',()=>{
  const s=createInitialState();s.messages.push({role:'user',at:3,text:'x'.repeat(MAX_STATE_BYTES)});
  assert.throws(()=>checkCapacity(s),/pleine/);
  assert.equal(s.messages[0].text.length,MAX_STATE_BYTES);
});
