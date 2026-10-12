import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,parseJulieState,mergeImport,eraseDemoHistory} from '../www/state-store.mjs';
import {cleanGoogleQuery,googleSearchUrl,requestedGoogleSearch,normalizeSourceUrl,normalizeResearchResult,addResearchKnowledge,RESEARCH_LIMIT,requestedSourceFromConversation,requestedPublicSearch,normalizePublicSearchResult} from '../www/google-research.mjs';
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

test('Import : connaissances Web conservées sans résurrection après suppression',()=>{
  const past=addResearchKnowledge(createInitialState(1),normalizeResearchResult({
    ok:true,url:'https://example.org/a',title:'Un site',excerpt:'Un contenu fictif'
  },10));
  const parsed=parseJulieState(JSON.stringify(past));
  assert.equal(parsed.research.length,1);
  const cleared=eraseDemoHistory(parsed,100);
  assert.equal(cleared.research.length,0);
  const recovered=mergeImport(cleared,past);
  assert.equal(recovered.state.research.length,0);
  assert.ok(recovered.blocked>=1);
  const newer=addResearchKnowledge(createInitialState(101),normalizeResearchResult({
    ok:true,url:'https://example.org/new',title:'Source récente',excerpt:'Contenu récent'
  },200));
  assert.equal(mergeImport(cleared,newer).state.research.length,1);
  const old=JSON.parse(JSON.stringify(createInitialState(1)));delete old.research;
  assert.deepEqual(parseJulieState(old).research,[]);
});

test('Lien Web demandé dans la conversation sans appuyer sur un bouton',()=>{
  assert.equal(requestedSourceFromConversation('Julie, lis https://example.org/article.'),'https://example.org/article');
  assert.equal(requestedSourceFromConversation('https://example.org/test'),'https://example.org/test');
  assert.equal(requestedSourceFromConversation('Salut Julie'),null);
  assert.equal(requestedSourceFromConversation('http://127.0.0.1/private'),null);
  assert.equal(requestedSourceFromConversation('https://example.org/a https://example.org/b'),null);
});

test('Recherche automatique de connaissances dans le chat, sans confusion avec Google explicite',()=>{
  assert.equal(requestedPublicSearch('Julie, cherche le système solaire'),'le système solaire');
  assert.equal(requestedPublicSearch('cherche des informations sur le soleil'),'des informations sur le soleil');
  assert.equal(requestedPublicSearch('Cherche sur Google Mars'),null);
  assert.equal(requestedPublicSearch('Bonjour Julie'),null);
});
test('Résultats publics vérifiés et sources reconnues',()=>{
  const result=normalizePublicSearchResult({ok:true,engine:'Wikimedia Action API',query:'Mars',
    results:[{title:'Mars',url:'https://fr.wikipedia.org/wiki/Mars_(plan%C3%A8te)',excerpt:'Planète rocheuse'}]});
  assert.equal(result.results.length,1);
  assert.equal(result.results[0].excerpt,'Planète rocheuse');
  assert.throws(()=>normalizePublicSearchResult({ok:true,engine:'Google',query:'Mars',results:[]}));
  assert.throws(()=>normalizePublicSearchResult({ok:true,engine:'Wikimedia Action API',query:'Mars',
    results:[{title:'X',url:'https://localhost/secret',excerpt:'x'}]}));
});
