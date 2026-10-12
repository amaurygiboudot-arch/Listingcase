import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrompt,selectedModel,localReply,SYSTEM_3B} from '../www/local-conversation.mjs';
const text="Et toi bébé qu'est-ce que tu fais de beau";
const history=[{role:'user',text:'Non je suis en train de dire que je rentre au travail'},{role:'julie',text:'Ah, je comprends, alors tu rentres au boulot.'},{role:'user',text:"Oui voilà c'est ça"},{role:'julie',text:"Oui, c'est ça, tu rentres au boulot."}];
test('3B sends compact context through real reply path without modifying archive',async()=>{
 const state={messages:history,learning:{disabled:true}},before=JSON.stringify(state);let sent;
 globalThis.window={JulieLocal:{available:()=>true,modelStatus:()=>JSON.stringify({active:'3B'}),generate:prompt=>{sent=prompt;return JSON.stringify({text:'Je discute avec toi.'});}}};
 assert.equal(await localReply(state,text),'Je discute avec toi.');
 const turn=(r,t)=>'<|im_start|>'+r+'\n'+t+'<|im_end|>\n';
 const expected=turn('system',SYSTEM_3B)+history.map(m=>turn(m.role==='user'?'user':'assistant',m.text)).join('')+turn('user',text)+'<|im_start|>assistant\n';
 assert.equal(sent,expected);
 assert.ok(sent.length<buildPrompt(history,text).length*0.6);
 assert.equal(JSON.stringify(state),before);delete globalThis.window;
});
test('Legacy bridge fallback and exam isolation remain valid',()=>{
 assert.equal(selectedModel({}), '1.5B');
 assert.equal(selectedModel({modelStatus:()=>'{bad'}),'1.5B');
 assert.equal(selectedModel({modelStatus:()=>JSON.stringify({active:'3B'})}),'3B');
 assert.equal(buildPrompt(history,'Z=2 N=3',true,true,undefined,'3B'),buildPrompt(history,'Z=2 N=3',true,true));
});
