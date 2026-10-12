import test from 'node:test';
import assert from 'node:assert/strict';
import {controlReply,repetitionContext,checkDialogueReply} from '../www/dialogue-guard.mjs';
import {localReply,buildPrompt} from '../www/local-conversation.mjs';
const a="Je suis désolé, mon amour. Je suis sincère.";
const history=[{role:'user',text:'Tu dois apprendre'},{role:'julie',text:a},{role:'user',text:'Arrête'},{role:'julie',text:a}];
test('Stop handled without inference and without altering archive',async()=>{
 const state={messages:history,learning:{disabled:true}},before=JSON.stringify(state);
 globalThis.window={JulieLocal:{available:()=>true,start(){throw Error('Must not infer')}}};
 assert.equal(await localReply(state,'Arrête !'),"D’accord, j’arrête.");
 assert.equal(JSON.stringify(state),before);delete globalThis.window;
 assert.equal(controlReply('Arrête de répéter, stp'),"D’accord, j’arrête.");
 for(const text of ['Le train s’arrête','Pourquoi elle arrête ?','Ne t’arrête pas','Bébé'])assert.equal(controlReply(text),null);
});
test('Screenshot loop excluded only from prompt and stop creates context boundary',()=>{
 const before=JSON.stringify(history);
 assert.equal(repetitionContext(history).some(m=>m.text===a),false);
 assert.equal(buildPrompt(history,'Bébé').includes(a),false);
 assert.equal(JSON.stringify(history),before);
});
test('Repeated answer rejected before persistence; self apology feminized only at start',()=>{
 assert.throws(()=>checkDialogueReply(a,history,'Bébé'),/répète/);
 assert.equal(checkDialogueReply('Je suis désolé.',[],'x'),'Je suis désolée.');
 assert.equal(checkDialogueReply('Il dit : Je suis désolé.',[],'x'),'Il dit : Je suis désolé.');
 assert.equal(checkDialogueReply('D’accord',history,'x'),'D’accord');
});
test('Distinct useful history preserved and exams ignore persona and history',()=>{
 const messages=[{role:'user',text:'Z=2'},{role:'julie',text:'Deux protons.'}];
 assert.deepEqual(repetitionContext(messages),messages);
 assert.ok(!buildPrompt(history,'Z=2 N=3',true,true).includes('désolée'));
});
