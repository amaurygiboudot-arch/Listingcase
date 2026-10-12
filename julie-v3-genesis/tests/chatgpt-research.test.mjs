import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChatGPTResearch,addChatGPTResearch,validateImportedResearch} from '../www/chatgpt-research.mjs';
import {createInitialState,parseJulieState,mergeImport,eraseDemoHistory} from '../www/state-store.mjs';
const data={type:'julie.research.v1',origin:'chatgpt',title:'Énergie solaire',
summary:'Synthèse documentée et hypothèses encore incertaines.',sources:[{title:'Source',url:'https://example.org/solar'}]};
test('Import ChatGPT explicite, sourcé, daté et distinct des souvenirs',()=>{
  const entry=parseChatGPTResearch(JSON.stringify(data),100);
  assert.equal(entry.origin,'chatgpt');
  assert.equal(entry.verified,false);
  const initial=createInitialState(1);
  const next=addChatGPTResearch(initial,entry);
  assert.equal(next.externalResearch.length,1);
  assert.equal(next.messages.length,0);
  assert.equal(addChatGPTResearch(next,entry).externalResearch.length,1);
  assert.equal(parseJulieState(JSON.stringify(next)).externalResearch.length,1);
});
test('Un rapport non conforme et une source privée sont refusés',()=>{
  assert.throws(()=>parseChatGPTResearch('conversation complète privée'));
  assert.throws(()=>parseChatGPTResearch(JSON.stringify({...data,origin:'unknown'})));
  assert.throws(()=>parseChatGPTResearch(JSON.stringify({...data,sources:[{url:'http://localhost:8080'}]})));
  assert.throws(()=>parseChatGPTResearch(JSON.stringify({...data,sources:[{url:'https://user:pass@example.org'}]})));
  assert.throws(()=>parseChatGPTResearch(JSON.stringify({...data,summary:'x'.repeat(4001)})));
});
test('Effacement définitif et réimport empêchée',()=>{
  const entry=parseChatGPTResearch(JSON.stringify(data),100);
  const before=addChatGPTResearch(createInitialState(1),entry);
  const erased=eraseDemoHistory(before,200);
  assert.deepEqual(erased.externalResearch,[]);
  const restore=mergeImport(erased,before);
  assert.equal(restore.state.externalResearch.length,0);
  assert.ok(restore.blocked>0);
  assert.equal(mergeImport(createInitialState(1),before).state.externalResearch.length,1);
  validateImportedResearch([]);
});
