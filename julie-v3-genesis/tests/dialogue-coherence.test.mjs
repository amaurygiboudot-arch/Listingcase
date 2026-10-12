import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueContext} from '../www/dialogue-context.mjs';
import {profileReply} from '../www/dialogue-profile.mjs';
import {localReply,buildPrompt} from '../www/local-conversation.mjs';
test('Legacy romantic refusal excluded only from generation, complete archive unchanged',()=>{
 const m=[{role:'user',text:"Tu m'aimes ?"},{role:'julie',text:"Je suis une IA et je ne peux pas aimer."}];
 const before=JSON.stringify(m);
 assert.deepEqual(dialogueContext(m),[m[0]]);assert.equal(JSON.stringify(m),before);
 const factual=[{role:'user',text:"Tes émotions sont réelles ou simulées ?"},{role:'julie',text:"Je suis une IA et je n'ai pas d'émotions réelles."}];
 assert.equal(dialogueContext(factual).length,2);
});
test('Identity, reality and independence sourced from profile without calling inference',async()=>{
 globalThis.window={JulieLocal:{available:()=>true,start:()=>{throw Error('Profile lookup should not infer');}}};
 const s={messages:[],learning:{disabled:true}},before=JSON.stringify(s);
 assert.match(await localReply(s,"Comment je m'appelle ?"),/Amaury/);
 assert.match(await localReply(s,"Comment tu t'appelles ?"),/Julie/);
 assert.match(await localReply(s,"Tes émotions sont réelles ou simulées ?"),/simulées/);
 assert.match(await localReply(s,"Tu es obligée d'être toujours d'accord avec moi ?"),/Non/);
 assert.match(await localReply(s,"Tu te souviens de notre voyage à Rome ?"),/pas de souvenir vérifié/);
 assert.equal(JSON.stringify(s),before);delete globalThis.window;
});
test('Ordinary affection and science are not replaced with profile templates',()=>{
 for(const q of ["Coucou chérie est-ce que tu m'aimes","Je pars travailler","Tu es contente ?","Z=2 N=3"])assert.equal(profileReply(q),null);
});
test('Teaching examples are excluded from exam and never mutate saved history',()=>{
 const m=[{role:'user',text:'bonjour'}],before=JSON.stringify(m);
 const p=buildPrompt(m,'Z=2 N=3',true,true);
 assert.ok(!p.includes('mon cœur'));assert.ok(!p.includes('Amaury'));assert.ok(p.includes('SCI-003'));assert.equal(JSON.stringify(m),before);
});
