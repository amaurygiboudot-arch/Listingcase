import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { JULIE_ID } from '../tools/julie-spec.mjs';

const tool=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../tools/prepare-julie.mjs');
const put=(root,file,text)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);};
const read=(root,file)=>fs.readFileSync(path.join(root,file),'utf8');
const backups=root=>fs.readdirSync(root).filter(x=>x.startsWith('data-backup-julie-'));
const run=(root,...flags)=>spawnSync(process.execPath,[tool,'--repo',root,...flags],{encoding:'utf8'});
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'julie-test-'));
 put(root,'.gitignore','data/\n.env\ndata-backup-*/\n');
 put(root,'config/predefined-characters.json',JSON.stringify([{personId:'CHLOE_001',seed:'CHLOE_001_seed_main',name:'Chloé',type:'femme'}],null,2));
 put(root,'config/canonical-personas.json',JSON.stringify({schema_version:1,personas:{CHLOE_001:{relationship_snapshot:'Ancien souvenir'}}},null,2));
 put(root,'index.html','<title>Human Partner</title>');
 const app=`let appState={characters:[]},creatingNew=false,selected=new Set();
 function onboarding(){
  const adding=Boolean(appState.partner&&creatingNew);
 return \`<button id="createPartner" class="primary">Faire connaissance</button>\`;}
 function page(){return \`<div class="brand">Human Partner</div><h2>Chloé canonique</h2>Ce profil fixe la continuité de Chloé avec Amaury. L’identité vivante peut évoluer autour de ce socle sans le remplacer.\`;}
 const api=async()=>({});const render=()=>{};const esc=String;
 function bind(){
  document.querySelector("#createPartner")?.addEventListener("click",async()=>{});
}
 `;
 put(root,'app.js',app);
 put(root,'README.md','# Human Partner — architecture locale\n\nContenu historique.');
 const dbPath=path.join(root,'data','human-partner.sqlite');fs.mkdirSync(path.dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);db.exec("CREATE TABLE evidence(value TEXT); INSERT INTO evidence(value) VALUES('avant Julie')");db.close();
 return root;
}
test('prévisualisation sans mutation',()=>{
 const root=fixture();try{const before=read(root,'app.js');const result=run(root);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/DRY_RUN/);assert.equal(read(root,'app.js'),before);assert.deepEqual(backups(root),[]);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('migration avec sauvegarde cohérente et personnages préservés',()=>{
 const root=fixture();try{
 const result=run(root,'--apply');assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
 const profiles=JSON.parse(read(root,'config/predefined-characters.json'));
 assert.equal(profiles.length,2);assert.ok(profiles.some(p=>p.personId==='CHLOE_001'));
 const julie=profiles.find(p=>p.personId===JULIE_ID);
 assert.equal(julie.name,'Julie');assert.equal(julie.ageYearsAtLaunch,22);
 assert.equal(julie.visualIdentity.heightMeters,1.75);
 const personas=JSON.parse(read(root,'config/canonical-personas.json')).personas;
 assert.ok(personas.CHLOE_001);assert.ok(personas[JULIE_ID]);assert.equal(Object.hasOwn(personas[JULIE_ID],'relationship_snapshot'),false);
 assert.match(read(root,'app.js'),/JULIE_MIGRATION_V1/);
 assert.match(read(root,'index.html'),/JULIE/);
 const bs=backups(root);assert.equal(bs.length,1);
 const db=new DatabaseSync(path.join(root,bs[0],'human-partner.sqlite'));
 try{assert.equal(db.prepare('SELECT value FROM evidence').get().value,'avant Julie');assert.deepEqual(Object.values(db.prepare('PRAGMA integrity_check').get()),['ok']);}finally{db.close();}
 const check=spawnSync(process.execPath,['--check',path.join(root,'app.js')],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('relance idempotente',()=>{
 const root=fixture();try{assert.equal(run(root,'--apply').status,0);const old=read(root,'config/predefined-characters.json');const again=run(root,'--apply');assert.equal(again.status,0,again.stderr);assert.match(again.stdout,/"modifiedFiles": \[\]/);assert.equal(read(root,'config/predefined-characters.json'),old);assert.equal(backups(root).length,1);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('refus si JULIE_001 existe avec une autre identité',()=>{
 const root=fixture();try{const p=JSON.parse(read(root,'config/predefined-characters.json'));p.push({personId:JULIE_ID,seed:'ancienne-vie',name:'Julie'});put(root,'config/predefined-characters.json',JSON.stringify(p));const before=read(root,'config/predefined-characters.json');const result=run(root,'--apply');assert.notEqual(result.status,0);assert.match(result.stderr,/validation humaine nécessaire/);assert.equal(read(root,'config/predefined-characters.json'),before);assert.equal(backups(root).length,0);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('arrêt avant modification si l’interface ne correspond pas',()=>{
 const root=fixture();try{put(root,'app.js','interface personnalisée');const result=run(root,'--apply');assert.notEqual(result.status,0);assert.equal(backups(root).length,0);assert.match(read(root,'index.html'),/Human Partner/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('les données originales restent lisibles après migration',()=>{
 const root=fixture();try{
  assert.equal(run(root,'--apply').status,0);
  const db=new DatabaseSync(path.join(root,'data','human-partner.sqlite'));
  try{assert.equal(db.prepare('SELECT value FROM evidence').get().value,'avant Julie');}
  finally{db.close();}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('refuse de créer une sauvegarde non ignorée par Git',()=>{
 const root=fixture();try{
  put(root,'.gitignore','node_modules/\n');
  const result=run(root,'--apply');assert.notEqual(result.status,0);
  assert.match(result.stderr,/ne protège pas data-backup/);
  assert.equal(backups(root).length,0);
  assert.match(read(root,'index.html'),/Human Partner/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
