import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {emptyDocumentary,ingestDriveSnapshot,verifiedRules,revisionQueue,mergeDocumentary,learningPriorities} from '../www/documentary-memory.mjs';
import {runSurpriseExam,gradeExam,createExam} from '../www/exam-engine.mjs';
import {syncDriveLearning} from '../www/drive-learning-sync.mjs';
import {createInitialState,parseJulieState,mergeImport} from '../www/state-store.mjs';
import {eraseLearning} from '../www/learning-engine.mjs';
const packet=JSON.parse(readFileSync(new URL('../www/science-drive-snapshot.json',import.meta.url),'utf8'));
const NOW=1791749400000,DAY=86400000;
const seeded=async()=> (await ingestDriveSnapshot(emptyDocumentary(),packet,{at:NOW})).state;
test('Drive réel : empreinte vérifiée et doublon ignoré',async()=>{
  const a=await seeded(),b=await ingestDriveSnapshot(a,packet,{at:NOW+1});
  assert.equal(b.changed,false);assert.deepEqual(a,b.state);assert.ok(await verifiedRules(a));
});
test('correction conservée sans promotion automatique ; ancienne version préservée',async()=>{
  const a=await seeded();const b=await ingestDriveSnapshot(a,{...packet,text:packet.text+'\nCorrection non validée',modifiedAt:'2026-10-12T00:00:00Z'},{at:NOW+DAY});
  assert.equal(b.state.versions.length,2);assert.equal(b.state.versions[0].text,packet.text);
  assert.equal(await verifiedRules(b.state),null);
  await assert.rejects(runSurpriseExam(b.state),/vérifiée/);
});
test('falsification du texte avec empreinte conservée bloque le répondant',async()=>{
  const a=await seeded();a.versions[0].text+='fake';assert.equal(await verifiedRules(a),null);
});
test('examens sur 20 ; répondant sans accès au corrigé ; erreurs prioritaires',async()=>{
  const a=await seeded();let calls=0;
  const r=await runSurpriseExam(a,{at:NOW+1,respond:(q,rules)=>{
    assert.equal(q.expected,undefined);assert.equal(q.explanation,undefined);assert.equal(rules.score,undefined);calls++;return null;
  }});
  assert.equal(calls,4);assert.equal(r.attempt.score,0);assert.equal(learningPriorities(r.state).length,4);
  const good=await runSurpriseExam(r.state,{at:NOW+2});assert.equal(good.attempt.score,20);
  assert.equal(good.state.attempts.length,2);assert.equal(r.state.attempts[0].score,0);
});
test('barème indépendant : exactitude et types ; pas de note complaisante',()=>{
  const exam=createExam({draw:()=>0.75});
  assert.equal(gradeExam(exam,exam.map(q=>q.expected)).score,20);
  assert.equal(gradeExam(exam,exam.map(q=>String(q.expected))).score,0);
});
test('échéances J+1 J+7 J+30 et aucune réussite anticipée',async()=>{
  let a=await seeded();assert.deepEqual(revisionQueue(a,NOW).map(x=>x.dueAt),[1,7,30].map(n=>NOW+n*DAY));
  a=(await runSurpriseExam(a,{at:NOW+1})).state;assert.ok(revisionQueue(a,NOW+DAY).every(r=>!r.completed));
  a=(await runSurpriseExam(a,{at:NOW+DAY,review:true})).state;
  assert.equal(revisionQueue(a,NOW+DAY)[0].completed,true);assert.equal(revisionQueue(a,NOW+DAY)[1].completed,false);
});
test('import ancien et nouveau : conversation et résultats préservés, doublons évités',async()=>{
  const s=createInitialState(NOW);s.messages=[{role:'user',text:'souvenir témoin',at:NOW}];s.memories=[{kind:'préférence',text:'test',at:NOW}];s.futureField={keep:true};
  const old=structuredClone(s);delete old.learning;
  s.learning.documentary=(await runSurpriseExam(await seeded(),{at:NOW+1})).state;
  const merged=mergeImport(s,old).state;
  assert.deepEqual(merged.messages,s.messages);assert.deepEqual(merged.memories,s.memories);assert.deepEqual(merged.futureField,s.futureField);
  assert.deepEqual(mergeImport(merged,s).state,merged);
});
test('suppression et ancien export : aucune résurrection de documents ou examens',async()=>{
  const s=createInitialState(NOW);s.learning.documentary=(await runSurpriseExam(await seeded(),{at:NOW+1})).state;
  const erased={...s,learning:eraseLearning(s.learning,NOW+2)};
  const merged=mergeImport(erased,s).state;assert.equal(merged.learning.documentary.versions.length,0);assert.equal(merged.learning.documentary.attempts.length,0);
  let called=false;const r=await syncDriveLearning(merged.learning,{readDocument:()=>{called=true;return packet}});assert.equal(called,false);assert.equal(r.changed,false);
});
test('erreur réseau et format invalide : état original inchangé',async()=>{
  const s=createInitialState(NOW),before=JSON.stringify(s);
  await assert.rejects(syncDriveLearning(s.learning,{readDocument:async()=>{throw new Error('réseau')}}),/réseau/);
  await assert.rejects(syncDriveLearning(s.learning),/authentifiée/);
  await assert.rejects(ingestDriveSnapshot(emptyDocumentary(),{...packet,fileId:'étranger'}),/autorisé/);
  assert.equal(JSON.stringify(s),before);
});
test('conflits de résultats refusés sans écrasement',async()=>{
  const a=(await runSurpriseExam(await seeded(),{at:NOW})).state,b=structuredClone(a);b.attempts[0].mode='autre';
  assert.throws(()=>mergeDocumentary(a,b),/Conflit/);
});
test('redémarrage dans un NOUVEAU processus : savoir, note et souvenirs retrouvés',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'julie-learning-'));
  try{
    const s=createInitialState(NOW);s.messages=[{role:'user',text:'sentinelle',at:NOW}];
    s.learning.documentary=(await runSurpriseExam(await seeded(),{at:NOW+1})).state;
    const path=join(dir,'state.json');writeFileSync(path,JSON.stringify(s));
    const module=new URL('../www/state-store.mjs',import.meta.url).href,engine=new URL('../www/exam-engine.mjs',import.meta.url).href;
    const code=`import {readFileSync} from 'node:fs';import {parseJulieState} from ${JSON.stringify(module)};import {runSurpriseExam} from ${JSON.stringify(engine)};const s=parseJulieState(readFileSync(process.argv[1],'utf8'));const r=await runSurpriseExam(s.learning.documentary);console.log(JSON.stringify({messages:s.messages.length,prior:s.learning.documentary.attempts.length,score:r.attempt.score,versions:r.state.versions.length}));`;
    const p=spawnSync(process.execPath,['--input-type=module','-e',code,path],{encoding:'utf8'});
    assert.equal(p.status,0,p.stderr);assert.deepEqual(JSON.parse(p.stdout),{messages:1,prior:1,score:20,versions:1});
  }finally{rmSync(dir,{recursive:true,force:true});}
});
