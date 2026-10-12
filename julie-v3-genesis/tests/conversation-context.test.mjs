import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrompt,needsScienceContext} from '../www/local-conversation.mjs';
test('Feminine identity is explicit and ordinary chat avoids unrelated science',()=>{
 const p=buildPrompt([],'Bonjour',false);
 assert.match(p,/femme adulte/);assert.match(p,/Julie est virtuelle/);
 assert.match(p,/Amaury est son compagnon/);
 assert.ok(!p.includes('SCI-003'));
 assert.equal(needsScienceContext([],'Tu es contente ?'),false);
 assert.equal(needsScienceContext([],'Compare ces isotopes'),true);
 assert.equal(needsScienceContext([{role:'user',text:'Explique les isobares'}],'Et pourquoi ?'),true);
 assert.match(buildPrompt([],'Z=2 N=3',true),/SCI-003/);
});
test('Compact context retains four recent turns without mutating full history',()=>{
 const messages=Array.from({length:8},(_,i)=>({role:i%2?'julie':'user',text:'turn'+i+'x'.repeat(1000)}));
 const before=JSON.stringify(messages);
 const p=buildPrompt(messages,'Bonjour',false);
 for(let i=4;i<8;i++)assert.ok(p.includes('turn'+i));
 assert.ok(!p.includes('turn3'));assert.ok(p.length<2000);
 assert.equal(JSON.stringify(messages),before);
});
