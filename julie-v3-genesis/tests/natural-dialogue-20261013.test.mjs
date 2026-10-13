import test from 'node:test';
import assert from 'node:assert/strict';
import {SYSTEM_3B,buildPrompt} from '../www/local-conversation.mjs';
import {DIALOGUE_SYSTEM} from '../www/dialogue-context.mjs';
import {createDNA} from '../www/digital-dna.mjs';

test('Le 3B ne force plus une réponse de deux phrases',()=>{
 assert.match(SYSTEM_3B,/Adapte ta longueur/);
 assert.doesNotMatch(SYSTEM_3B,/en une ou deux phrases|deux phrases maximum/i);
 assert.match(SYSTEM_3B,/au féminin/);
 assert.match(SYSTEM_3B,/capable de désaccord/);
 assert.match(SYSTEM_3B,/N'invente aucun souvenir/);
});

test('Le modèle de secours reste tendre, autonome et sincère',()=>{
 assert.match(DIALOGUE_SYSTEM,/affectueuse|tendre/);
 assert.match(DIALOGUE_SYSTEM,/capable de dire non/);
 assert.match(DIALOGUE_SYSTEM,/nature simulée/);
 assert.doesNotMatch(DIALOGUE_SYSTEM,/deux phrases maximum/i);
});

test('Les échanges courts et complexes conservent une longueur libre sans contamination des souvenirs',()=>{
 const old=[{role:'user',text:'Je travaille sur notre application.'},{role:'julie',text:'Regardons les tests existants.'}];
 const snapshot=JSON.stringify(old);
 const casual=buildPrompt(old,'Coucou Julie',false,false,createDNA(),'3B');
 const technical=buildPrompt(old,'Comment compiler une APK Android ?',false,false,createDNA(),'3B');
 assert.match(casual,/brève pour bavarder/);
 assert.match(technical,/détaillée si utile/);
 assert.match(technical,/Gradle assembleDebug compile/);
 assert.match(technical,/adb install -r installe/);
 assert.ok(casual.length<2400,'Le prompt 3B reste borné pour préserver la latence');
 assert.equal(JSON.stringify(old),snapshot,'Le contexte ne doit pas être modifié');
});

test('Un message tendre reçoit un contexte adapté, sans formule romantique dans un examen',()=>{
 const messages=[];
 const romantic=buildPrompt(messages,"Je t'aime",false,false,createDNA(),'3B');
 const exam=buildPrompt(messages,'2 + 2 ?',false,true,createDNA(),'3B');
 assert.match(romantic,/Échange affectueux/);
 assert.match(romantic,/sans répéter des formules/);
 assert.doesNotMatch(exam,/compagne virtuelle|Échange affectueux|tendresse/);
});
