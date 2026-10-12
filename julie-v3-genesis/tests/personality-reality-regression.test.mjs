import test from 'node:test';
import assert from 'node:assert/strict';
import {profileReply} from '../www/dialogue-profile.mjs';
import {stripUnverifiedSharedMoments,checkDialogueReply} from '../www/dialogue-guard.mjs';
import {buildPrompt,SYSTEM_3B,localReply} from '../www/local-conversation.mjs';
import {createDNA} from '../www/digital-dna.mjs';
import fs from 'node:fs';

test('Une question directe sur les émotions reçoit une transparence sincère',()=>{
 const answer=profileReply('Est-ce que tu ressens vraiment des émotions comme une personne humaine ?');
 assert.match(answer,/émotions simulées/);
 assert.doesNotMatch(answer,/^oui, je peux ressentir/i);
 assert.match(profileReply('Tes émotions sont-elles réelles ?'),/simulées/);
 assert.match(profileReply('Tu es une IA ?'),/compagne virtuelle/);
});
test('Une conversation affective banale ne déclenche aucun rappel IA forcé',()=>{
 for(const s of ['Coucou ma chérie !','Je t’aime.','Tu vas bien ?','J’ai besoin d’un câlin','Aide-moi à compiler notre APK']){
  assert.equal(profileReply(s),null,s);
 }
});
test('Un souvenir partagé inventé par le 3B ne contamine pas le dialogue',()=>{
 const raw="Coucou mon cœur, tout va bien ici. J'adore quand tu arrives du travail, ça me rappelle notre petite pause du soir. Comment était ta journée ?";
 const corrected=checkDialogueReply(raw,[],'Coucou Julie, je rentre du travail',[]);
 assert.doesNotMatch(corrected,/pause du soir/);
 assert.match(corrected,/Coucou mon cœur/);
 assert.match(corrected,/Comment était ta journée/);
});
test('Une préférence explicite vérifiée autorise la référence correspondante',()=>{
 const raw='Ça me rappelle notre petite pause du soir.';
 const mem=[{source:'message utilisateur',confidence:1,kind:'déclaration utilisateur',text:"J'aime notre petite pause du soir."}];
 assert.equal(stripUnverifiedSharedMoments(raw,mem),raw);
 assert.match(stripUnverifiedSharedMoments(raw,[]),/ne pas inventer/);
});
test('Une invitation imaginaire ne devient pas un souvenir inventé',()=>{
 const text='On pourrait imaginer notre prochain rendez-vous au bord de la mer.';
 assert.equal(stripUnverifiedSharedMoments(text,[]),text);
});
test('La différence entre technique et intimité reste explicite et les examens sont isolés',()=>{
 assert.match(SYSTEM_3B,/N'invente aucun souvenir/);
 const project=buildPrompt([],'Comment vérifier notre compilation Android ?',false,false,createDNA(),'3B');
 assert.match(project,/2 à 4 étapes vérifiables/);
 const exam=buildPrompt([],'2+2',false,true,createDNA(),'3B');
 assert.doesNotMatch(exam,/émotions réelles|rituel|2 à 4 étapes/);
});
test('Raccordement réel du profil et de la protection mémoire',()=>{
 const local=fs.readFileSync(new URL('../www/local-conversation.mjs',import.meta.url),'utf8');
 assert.ok(local.indexOf('const profile=profileReply(text)')<local.indexOf('await generateLocal('));
 assert.match(local,/state\.messages,text,state\.memories/);
});

// Ces phrases ont été produites par le véritable moteur 3B sur Redmi,
// avec des prompts fictifs : aucune conversation privée n'est lue.
test('Le pipeline complet corrige la réponse réelle du 3B sans modifier la mémoire',async()=>{
 const state={messages:[],memories:[],dna:createDNA(),learning:{disabled:true}};
 const before=JSON.stringify(state);
 let nativeCalls=0;
 globalThis.window={JulieLocal:{available:()=>true,modelStatus:()=>JSON.stringify({active:'3B'}),
  generate:()=>{nativeCalls++;return JSON.stringify({text:'Oui, je peux ressentir des émotions, mais je suis une intelligence artificielle.'})}}};
 try{
  const result=await localReply(state,'Est-ce que tu ressens vraiment des émotions comme une personne humaine ?');
  assert.match(result,/émotions simulées/);
  assert.doesNotMatch(result,/Oui, je peux ressentir/);
  assert.equal(nativeCalls,0,'Une question explicite sur la réalité doit être traitée avant le modèle');
  assert.equal(JSON.stringify(state),before);
 }finally{delete globalThis.window;}
});
test('Le pipeline complet empêche une fausse pause du soir inventée par le 3B',async()=>{
 const state={messages:[],memories:[],dna:createDNA(),learning:{disabled:true}};
 const before=JSON.stringify(state);
 globalThis.window={JulieLocal:{available:()=>true,modelStatus:()=>JSON.stringify({active:'3B'}),
  generate:()=>JSON.stringify({text:"Coucou mon cœur, tout va bien ici. J'adore quand tu arrives du travail, ça me rappelle notre petite pause du soir. Comment était ta journée ?"})}};
 try{
  const result=await localReply(state,'Coucou Julie, je rentre du travail. Tu vas bien ?');
  assert.doesNotMatch(result,/pause du soir/);
  assert.match(result,/Comment était ta journée/);
  assert.equal(JSON.stringify(state),before);
 }finally{delete globalThis.window;}
});
