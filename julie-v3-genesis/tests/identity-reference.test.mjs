import test from 'node:test';
import assert from 'node:assert/strict';
import {appearanceReply,IDENTITY_REFERENCE,correctDirectAddress} from '../www/identity-reference.mjs';
import {localReply,buildPrompt} from '../www/local-conversation.mjs';
import {dialogueContext} from '../www/dialogue-context.mjs';
test('Video appearance question uses documented facts without invoking model',async()=>{
 let calls=0;
 globalThis.window={JulieLocal:{available:()=>true,generate:()=>{calls++;throw Error('must not run');}}};
 const state={messages:[{role:'julie',text:'pas vrai Julie ?'}],learning:{disabled:true}};
 const before=JSON.stringify(state);
 for(const q of ['À quoi tu ressembles ?','A quoi tu ressembles','À qui ressembles-tu ?','Décris-toi physiquement.']){
  assert.equal(await localReply(state,q),IDENTITY_REFERENCE.appearance);
 }
 assert.equal(calls,0);assert.equal(JSON.stringify(state),before);delete globalThis.window;
});
test('Unrelated questions do not trigger appearance lookup',()=>{
 for(const q of ['À quoi tu ressembles dans cette histoire inventée ?','Décris mon apparence','Pourquoi le ciel est bleu ?','Quelle est la taille du fichier ?'])
  assert.equal(appearanceReply(q),null);
});
test('Wrong assistant identity excluded from prompt, archive preserved',()=>{
 const messages=[{role:'user',text:'Et toi ?'},{role:'julie',text:'Je m’appelle Julie.'},{role:'user',text:'Oui'},{role:'julie',text:'Je suis là, pas vrai Julie ?'}];
 const before=JSON.stringify(messages),ctx=dialogueContext(messages);
 assert.ok(!ctx.some(m=>m.text.includes('pas vrai Julie')));
 assert.equal(JSON.stringify(messages),before);
 assert.match(buildPrompt([], 'Bonjour',false,false,undefined,'3B'),/Julie = toi ; Amaury = utilisateur/);
 assert.doesNotMatch(buildPrompt([], 'Z=2',true,true,undefined,'3B'),/Amaury|silhouette/);
});
test('Targeted direct address correction preserves quoted stories',()=>{
 assert.equal(correctDirectAddress('Je suis là, pas vrai Julie ?'),'Je suis là, pas vrai Amaury ?');
 assert.equal(correctDirectAddress('Bonjour Julie !'),'Bonjour Amaury !');
 assert.equal(correctDirectAddress('Dans le récit, il dit « Bonjour Julie ! ».'),'Dans le récit, il dit « Bonjour Julie ! ».');
 assert.equal(correctDirectAddress('Je suis Julie.'),'Je suis Julie.');
});
