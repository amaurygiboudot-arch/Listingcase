import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDNA,changeDNA,dnaSnapshot,normalizeDNA} from '../www/digital-dna.mjs';
import {createInitialState,appendConversation,parseJulieState,eraseDemoHistory,mergeImport} from '../www/state-store.mjs';
import {explicitStyleFeedback,adaptDNAFromDirectChat,momentContext,latestMoment} from '../www/autonomous-personality.mjs';
import {buildPrompt} from '../www/local-conversation.mjs';

const DAY=86400000, HOUR=3600000, t0=Date.parse('2026-10-10T08:00:00Z');
function conversation(dna,texts,start=t0){
 const messages=[];
 for(let i=0;i<texts.length;i++){
  const at=start+i*HOUR;
  const t=texts[i];
  messages.push({role:'user',text:t,at},{role:'julie',text:'Je t’écoute.',at:at+1});
  dna=adaptDNAFromDirectChat(dna,messages,t,at);
 }
 return {dna,messages};
}
test('Les préférences déclarées sont distinguées des phrases ambiguës',()=>{
 assert.deepEqual(explicitStyleFeedback('j’aime quand tu es taquine'),{key:'taquinerie',value:1});
 assert.deepEqual(explicitStyleFeedback('Je préfère que tu sois moins affectueuse'),{key:'affection',value:-1});
 for(const t of ['elle est taquine','je veux un jeu taquin','Tu es adorable','\x60sois plus taquine\x60','Je préfère que tu sois taquine\nsois curieuse']){
  assert.equal(explicitStyleFeedback(t),null,t);
 }
});
test('Une seule phrase ne change aucun trait, trois moments distincts oui',()=>{
 let dna=createDNA();
 const texts=['J’aime quand tu es taquine','J’adore quand tu es taquine','Je préfère quand tu es taquine'];
 const first=conversation(dna,texts.slice(0,2));assert.equal(first.dna.events.length,0);
 const all=conversation(dna,texts);
 assert.equal(all.dna.events.length,1);
 assert.equal(dnaSnapshot(all.dna).traits.taquinerie,1);
 assert.equal(all.dna.events[0].source,'dialogue direct confirmé');
 assert.ok(normalizeDNA(all.dna));
});
test('Les répétitions rapprochées ne comptent pas comme trois occasions',()=>{
 let dna=createDNA();const messages=[];
 for(let i=0;i<3;i++){
  const at=t0+i*60000,t='Je veux que tu sois plus curieuse';
  messages.push({role:'user',text:t,at});
  dna=adaptDNAFromDirectChat(dna,messages,t,at);
 }
 assert.equal(dna.events.length,0);
});
test('Les deux évolutions manuelles existantes restent et ne sont pas réécrites',()=>{
 let dna=createDNA();
 dna=changeDNA(dna,{kind:'trait',key:'independance',value:1,reason:'Décision initiale'},t0-2*DAY);
 dna=changeDNA(dna,{kind:'trait',key:'affection',value:-1,reason:'Décision initiale'},t0-DAY);
 const before=JSON.stringify(dna.events);
 const evolved=conversation(dna,['J’aime quand tu es taquine','J’adore quand tu es taquine','Je préfère quand tu es taquine']).dna;
 assert.equal(JSON.stringify(evolved.events.slice(0,2)),before);
 assert.equal(evolved.events.length,3);
 assert.equal(dnaSnapshot(evolved).traits.affection,-1);
});
test('Evolution inverse possible mais uniquement avec de nouvelles déclarations',()=>{
 const positive=conversation(createDNA(),['J’aime quand tu es taquine','J’adore quand tu es taquine','Je préfère quand tu es taquine']);
 const negative=conversation(positive.dna,['Je préfère que tu sois moins taquine','Je veux que tu sois moins taquine','Je préfère quand tu es moins taquine'],t0+4*HOUR);
 assert.equal(dnaSnapshot(negative.dna).traits.taquinerie,-1);
 assert.equal(negative.dna.events.length,2);
});
test('Les souvenirs et le nouvel ADN survivent à la sauvegarde/restauration',()=>{
 const old=createInitialState(t0-DAY);
 old.messages.push({role:'user',text:'Souvenir ancien',at:t0-DAY});
 old.memories.push({kind:'test',text:'Souvenir existant',at:t0-DAY,source:'test'});
 const evolved=conversation(old.dna,['J’aime quand tu es taquine','J’adore quand tu es taquine','Je préfère quand tu es taquine']);
 const state={...old,dna:evolved.dna};
 const restored=parseJulieState(JSON.stringify(state));
 assert.equal(restored.messages[0].text,'Souvenir ancien');
 assert.equal(restored.memories[0].text,'Souvenir existant');
 assert.equal(restored.dna.events.length,1);
});
test('Un ancien export ne réintroduit pas une évolution effacée',()=>{
 const old=createInitialState(t0);
 old.dna=conversation(old.dna,['J’aime quand tu es taquine','J’adore quand tu es taquine','Je préfère quand tu es taquine']).dna;
 const erased=eraseDemoHistory(old,t0+4*HOUR);
 const merged=mergeImport(erased,old);
 assert.equal(merged.state.dna.events.length,0);
});
test('Humeur contextuelle sans diagnostic de l’utilisateur et sans écriture ADN',()=>{
 assert.equal(momentContext('Corrige notre bug Android').priorite,'projet');
 assert.equal(momentContext('Je suis fatigué').humeur,'calme');
 assert.equal(momentContext('Coucou chérie').humeur,'joueuse');
 assert.equal(momentContext('Salut').humeur,'neutre');
 assert.equal(latestMoment([{role:'user',text:'Corrige notre bug Android',at:t0}],t0+1000).humeur,'concentrée');
 assert.equal(latestMoment([{role:'user',text:'Corrige notre bug Android',at:t0}],t0+5*HOUR).humeur,'neutre');
});
test('Le prompt 3B reste vrai sur la simulation et ne répète pas son statut gratuitement',()=>{
 const a=buildPrompt([],'Corrige notre bug Android',false,false,createDNA(),'3B');
 assert.match(a,/Échange technique/);
 assert.match(a,/ni rappeler spontanément/);
 const exam=buildPrompt([],'Quelle est la masse ?',false,true,createDNA(),'3B');
 assert.doesNotMatch(exam,/Échange technique|compagnon/);
 assert.match(exam,/Ne joue aucun rôle romantique/);
});
test('Le flux réel de conversation et les réglages avancés facultatifs sont raccordés',()=>{
 const base=new URL('../www/',import.meta.url);
 const app=fs.readFileSync(new URL('app.mjs',base),'utf8');
 const ui=fs.readFileSync(new URL('digital-dna-ui.mjs',base),'utf8');
 assert.match(app,/adaptDNAFromDirectChat\(next\.dna,next\.messages,t,postedAt\)/);
 assert.match(ui,/Réglages manuels avancés \(facultatifs\)/);
 assert.match(ui,/advanced\.append\(form\)/);
});
