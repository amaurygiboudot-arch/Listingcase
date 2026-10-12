import test from 'node:test';
import assert from 'node:assert/strict';
import {recentPlanReply} from '../www/conversation-anchors.mjs';
import {correctDirectAddress} from '../www/identity-reference.mjs';
import {checkDialogueReply} from '../www/dialogue-guard.mjs';
import {localReply,buildPrompt} from '../www/local-conversation.mjs';
import {createDNA} from '../www/digital-dna.mjs';
const now=Date.now();
const plans=[{role:'user',text:'Je pars travailler dans une heure, tu as compris ?',at:now-1000},
 {role:'julie',text:'Oui, j’ai compris.',at:now-999}];
test('Julie rappelle correctement un projet explicite récent',()=>{
 const a=recentPlanReply(plans,'Tu peux me redire ce que je fais dans une heure ?',now);
 assert.match(a,/Tu m’as dit que tu partais travailler dans une heure/);
 assert.doesNotMatch(a,/je serai.*pour te recevoir/);
});
test('Un plan ambigu, ancien ou sans provenance ne devient jamais un souvenir',()=>{
 assert.equal(recentPlanReply([], 'Tu peux me redire ce que je fais dans une heure ?',now),null);
 assert.equal(recentPlanReply([{role:'user',text:'Je ne pars pas travailler dans une heure',at:now-1000}],'Tu peux me redire ce que je fais ?',now),null);
 assert.equal(recentPlanReply([{role:'user',text:'Je pars travailler dans une heure',at:now-31*60000}],'Rappelle-moi ce que je fais',now),null);
 assert.equal(recentPlanReply([{role:'julie',text:'Tu pars travailler dans une heure',at:now-1000}],'Rappelle-moi',now),null);
 assert.equal(recentPlanReply(plans,'Comment vas-tu aujourd’hui ?',now),null);
});
test('Le chemin de réponse réel utilise le plan sans appeler le modèle',async()=>{
 let calls=0;const state={messages:plans,memories:[],dna:createDNA(),learning:{disabled:true}};
 const snapshot=JSON.stringify(state);
 globalThis.window={JulieLocal:{available:()=>true,modelStatus:()=>JSON.stringify({active:'3B'}),generate:()=>{calls++;return JSON.stringify({text:'FAUX'})}}};
 try{
  const result=await localReply(state,'Tu peux me redire ce que je fais dans une heure ?');
  assert.match(result,/tu partais travailler/i);
  assert.equal(calls,0);
  assert.equal(JSON.stringify(state),snapshot);
 }finally{delete globalThis.window}
});
test('Julie ne confond pas son prénom avec celui du compagnon',()=>{
 assert.equal(correctDirectAddress('Je suis là pour toi, Julie.'),'Je suis là pour toi, Amaury.');
 assert.equal(correctDirectAddress('Tu peux compter sur moi, Julie !'),'Tu peux compter sur moi, Julie !'); // correction ciblée, sans surcorrection
 assert.equal(correctDirectAddress('Moi, je suis Julie.'),'Moi, je suis Julie.');
 const fixed=checkDialogueReply('Je suis là pour toi, Julie.',[],'Je suis fatigué');
 assert.match(fixed,/Amaury/);
 assert.equal(checkDialogueReply('Chérie, je comprends, mais je ne suis pas d’accord.',[],'Tu dois être d’accord avec moi.'),'Mon cœur, je comprends, mais je ne suis pas d’accord.');
});
test('Une commande adb install n’est jamais présentée comme une compilation',()=>{
 const bad='D’abord adb devices, puis adb install -r ton_projet.apk pour compiler et installer ton application.';
 const good=checkDialogueReply(bad,[],'On doit vérifier une compilation Android. Donne deux actions précises.');
 assert.match(good,/Gradle assembleDebug/);
 assert.match(good,/adb install -r sert seulement à installer/);
 assert.doesNotMatch(good,/pour compiler et installer/);
 const correct='Lance Gradle pour compiler, puis adb install -r app.apk pour installer.';
 assert.equal(checkDialogueReply(correct,[],'Compiler Android'),correct);
});
test('Le contexte technique utilise une distinction vérifiable',()=>{
 const prompt=buildPrompt([],'Comment compiler mon APK Android ?',false,false,createDNA(),'3B');
 assert.match(prompt,/Gradle assembleDebug compile/);
 assert.match(prompt,/adb install -r installe/);
 const exam=buildPrompt([],'2+2 ?',false,true,createDNA(),'3B');
 assert.doesNotMatch(exam,/Gradle assembleDebug/);
});

test('Julie n’exige pas une adresse IP pour parler de tests Android',()=>{
 const reply="Je peux te guider pour vérifier les tests Android. Tu peux me donner ton adresse IP ou une photo de ton écran pour que je puisse mieux comprendre.";
 const checked=checkDialogueReply(reply,[],"Tu as déjà exécuté ces tests sur mon ordinateur ?");
 assert.doesNotMatch(checked,/adresse IP/i);
 assert.match(checked,/vérifier les tests Android/);
 assert.equal(checkDialogueReply(reply,[],'Comment trouver mon adresse IP ?'),reply);
});
test('La précision Android ne rallonge pas les conversations sans rapport',()=>{
 const about=buildPrompt([],'Corrige mon application Android',false,false,createDNA(),'3B');
 assert.match(about,/Gradle assembleDebug compile/);
 const unrelated=buildPrompt([],'Organisons mon projet de roman',false,false,createDNA(),'3B');
 assert.doesNotMatch(unrelated,/Gradle assembleDebug/);
});
