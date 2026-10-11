import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {examConversation,isExamRequest} from '../www/chat-exams.mjs';
import {createInitialState,parseJulieState} from '../www/state-store.mjs';
import {syncDriveLearning} from '../www/drive-learning-sync.mjs';
test('commande de contrôle et conversation ordinaire distinctes',()=>{
  for(const t of ['contrôle surprise','Julie, lance un contrôle surprise','Passe un examen','contrôle'])assert.equal(isExamRequest(t),true,t);
  for(const t of ['bonjour','ne lance pas un contrôle','je parle du contrôle'])assert.equal(isExamRequest(t),false,t);
});
test('examen en conversation conservé avec son historique après relecture',async()=>{
  const snapshot=JSON.parse(await readFile(new URL('../www/science-drive-snapshot.json',import.meta.url),'utf8'));
  const before=createInitialState();
  before.learning=(await syncDriveLearning(before.learning,{readDocument:async()=>snapshot})).learning;
  const next=await examConversation(before,'contrôle surprise');
  assert.equal(before.messages.length,0);
  assert.equal(next.learning.documentary.attempts.length,1);
  assert.equal(next.messages.length,2);
  assert.match(next.messages[1].text,/20\/20/);
  assert.match(next.messages[1].text,/Corrigé : (vrai|faux)/);
  assert.match(next.messages[1].text,/Source : https:/);
  assert.deepEqual(parseJulieState(JSON.stringify(next)),next);
  assert.equal(await examConversation(next,'bonjour'),null);
  next.learning.disabled=true;
  await assert.rejects(examConversation(next,'contrôle surprise'),/désactivé/);
});
