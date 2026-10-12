import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanGoogleQuery,googleSearchUrl,requestedGoogleSearch,normalizeSourceUrl,normalizeResearchResult,addResearchKnowledge,RESEARCH_LIMIT} from '../www/google-research.mjs';
test('Recherche principale exclusivement Google.com, paramètres encodés',()=>{
  assert.equal(new URL(googleSearchUrl('actualité Julie & Qwen')).hostname,'www.google.com');
  assert.equal(new URL(googleSearchUrl('actualité Julie & Qwen')).searchParams.get('q'),'actualité Julie & Qwen');
  assert.throws(()=>cleanGoogleQuery(''),/180 caractères/);
  assert.throws(()=>cleanGoogleQuery('a'.repeat(181)),/180 caractères/);
});
test('Julie identifie une demande explicite et n’invente pas une recherche',()=>{
  assert.equal(requestedGoogleSearch('Cherche sur Google la météo à Nantes'),'la météo à Nantes');
  assert.equal(requestedGoogleSearch('fais une recherche : moteurs de recherche'),'moteurs de recherche');
  assert.equal(requestedGoogleSearch('Je suis contente de te retrouver'),null);
});
test('Ne pas ouvrir un lien interne, non HTTPS, avec identifiants ou port privé',()=>{
  for(const link of ['http://example.org','file:///tmp/a','https://localhost/admin','https://a.local/','https://user:pass@example.org/','https://example.org:4434/','https://example.org:8443/']){
    assert.throws(()=>normalizeSourceUrl(link));
  }
  assert.equal(normalizeSourceUrl('https://example.org/page#tracking'),'https://example.org/page');
});
test('Une source reste externe, datée, non vérifiée, distincte des souvenirs',()=>{
  const data=normalizeResearchResult({ok:true,url:'https://example.org/a',title:'Titre',excerpt:'texte utile'},1234);
  assert.deepEqual([data.kind,data.source,data.confidence,data.at],['information recherchée','page Web HTTPS','non vérifiée',1234]);
  const state={messages:[{role:'user',text:'bonjour'}],memories:[{kind:'accord',text:'test'}]};
  const next=addResearchKnowledge(state,data);
  assert.equal(next.research.length,1);
  assert.deepEqual(next.messages,state.messages);
  assert.deepEqual(next.memories,state.memories);
  assert.equal(addResearchKnowledge(next,data).research.length,1);
  assert.throws(()=>addResearchKnowledge({...state,research:Array(RESEARCH_LIMIT).fill(data)},data),/Limite/);
});
