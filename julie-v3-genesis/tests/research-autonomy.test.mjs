import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ingestResearchLead,newLearningState,reviewLearning,eraseLearning
} from '../www/learning-engine.mjs';
import {createInitialState,mergeImport} from '../www/state-store.mjs';

const T=Date.UTC(2026,9,10,12);
const lead={
  id:'wiki-fr-22131',topic:'Chimie',title:'Liaison chimique',
  excerpt:'Une liaison chimique est une interaction durable entre des atomes, des ions ou des molécules. Cet extrait est une source documentaire à recouper.',
  url:'https://fr.wikipedia.org/wiki/Liaison_chimique',
  fetchedAt:T
};

test('Découverte Android : provenance conservée et certitude faible',()=>{
  const r=ingestResearchLead(newLearningState(),lead);
  assert.equal(r.changed,true);
  assert.equal(r.learning.records.length,1);
  assert.equal(r.learning.records[0].status,'piste documentaire, source unique non corroborée');
  assert.equal(r.learning.records[0].confidence,0.1);
  assert.equal(r.learning.records[0].source.url,lead.url);
  assert.equal(r.learning.events[0].kind,'recherche documentaire reçue');
  assert.equal(r.learning.events[0].result,'à corroborer');
  assert.equal(reviewLearning(r.learning,{at:T+15*86400000}).changed,false);
});

test('Rejeu du même article : pas de doublon ni de remplacement silencieux',()=>{
  const before=ingestResearchLead(newLearningState(),lead).learning;
  const duplicate=ingestResearchLead(before,{...lead,excerpt:lead.excerpt+' Modification non corroborée'});
  assert.equal(duplicate.changed,false);
  assert.equal(duplicate.learning.records[0].answer,lead.excerpt);
  assert.equal(duplicate.learning.events.length,1);
});

test('Provenances non autorisées et données malformées refusées',()=>{
  const current=newLearningState();
  for(const bad of [
    {...lead,url:'http://fr.wikipedia.org/wiki/Liaison_chimique'},
    {...lead,url:'https://attacker.example/wiki/Liaison_chimique'},
    {...lead,url:'https://fr.wikipedia.org.evil.example/wiki/Liaison_chimique'},
    {...lead,url:'https://fr.wikipedia.org/other/Liaison_chimique'},
    {...lead,id:'wiki-fr-../../secret'},
    {...lead,excerpt:'court'},
    {...lead,fetchedAt:-100}
  ])assert.throws(()=>ingestResearchLead(current,bad));
  assert.equal(current.records.length,0);
});

test('Suppression volontaire : une recherche antérieure reste effacée',()=>{
  const before=ingestResearchLead(newLearningState(),lead).learning;
  const erased=eraseLearning(before,T+50);
  assert.equal(erased.disabled,true);
  assert.equal(ingestResearchLead(erased,{...lead,id:'wiki-fr-999',fetchedAt:T+100}).changed,false);
  assert.equal(mergeImport({...createInitialState(T),learning:erased},
    {...createInitialState(T),learning:before}).state.learning.records.length,0);
});

test('La recherche ne touche ni les messages ni les souvenirs du couple',()=>{
  const base=createInitialState(T);
  base.messages.push({role:'user',text:'Bonjour Julie',at:T});
  base.memories.push({kind:'déclaration utilisateur',text:'Préférence',at:T,source:'dialogue'});
  const updated={...base,learning:ingestResearchLead(base.learning,lead).learning};
  assert.equal(updated.messages.length,1);
  assert.equal(updated.memories.length,1);
  assert.equal(mergeImport(updated,base).state.learning.records.length,1);
});

test('Service Android séparé, réseau borné et permission non exportée',()=>{
  const root=new URL('../',import.meta.url);
  const native=fs.readFileSync(new URL('android/JulieResearchJobService.java',root),'utf8');
  const storage=fs.readFileSync(new URL('android/JulieSecureStore.java',root),'utf8');
  const manifest=fs.readFileSync(new URL('android/AndroidManifest.xml',root),'utf8');
  const app=fs.readFileSync(new URL('www/app.mjs',root),'utf8');
  const workflow=fs.readFileSync(new URL('../.github/workflows/julie-android.yml',root),'utf8');
  assert.match(native,/extends JobService/);
  assert.match(native,/setPeriodic\(DAILY\)/);
  assert.match(native,/NETWORK_TYPE_UNMETERED/);
  assert.match(native,/setPersisted\(true\)/);
  assert.match(native,/fr\.wikipedia\.org/);
  assert.match(native,/setInstanceFollowRedirects\(false\)/);
  assert.match(native,/48[0]{3}/);
  assert.match(storage,/AndroidKeyStore/);
  assert.match(storage,/private static final String RESEARCH_INBOX/);
  assert.match(storage,/acknowledgeResearchItem/);
  assert.match(storage,/clearResearchInbox/);
  assert.match(manifest,/BIND_JOB_SERVICE/);
  assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);
  assert.match(manifest,/android:exported="false"/);
  assert.match(app,/ingestResearchLead\(saved\.learning,item\)/);
  assert.match(app,/bridge\.acknowledgeResearchItem\(item\.id\)/);
  assert.match(workflow,/cp julie-v3-genesis\/android\/JulieUpdateManager\.java .*JulieResearchJobService\.java/);
});
