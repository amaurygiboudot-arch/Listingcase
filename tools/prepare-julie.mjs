#!/usr/bin/env node
/**
 * Migration additive et idempotente de Listingcase / Human Partner vers Julie.
 * Sans --apply : audit / prévisualisation seulement. Aucune table SQL n'est modifiée.
 * Avec --apply : sauvegarde des fichiers, copie SQLite cohérente, puis mise à jour prudente.
 * Compatible Node.js >= 22.5 ; aucune dépendance npm.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JULIE_ID, JULIE_PROFILE, JULIE_CANONICAL } from './julie-spec.mjs';

const args=process.argv.slice(2);
const getFlagValue=key=>{const i=args.indexOf(key);return i>=0?args[i+1]:null;};
const apply=args.includes('--apply');
const root=path.resolve(getFlagValue('--repo')||process.cwd());
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pretty=o=>JSON.stringify(o,null,2)+'\n';
const requireText=(text,needle,file)=>{
  if(!text.includes(needle))throw new Error(`${file} : signature attendue absente (${needle.slice(0,70)}). Stop sans modification.`);
};
function changeOnce(content,needle,replacement,file){
  if(content.includes(replacement))return content;
  requireText(content,needle,file);
  return content.replace(needle,replacement);
}
function buildPlan(){
  const paths=['config/predefined-characters.json','config/canonical-personas.json','app.js','index.html','README.md'];
  for(const p of paths)if(!fs.existsSync(path.join(root,p)))throw new Error(`Fichier requis absent: ${p}`);
  const pfile=paths[0], cfile=paths[1];
  const oldProfile=read(pfile), oldCanon=read(cfile);
  const profiles=JSON.parse(oldProfile), canonical=JSON.parse(oldCanon);
  if(!Array.isArray(profiles)||!canonical||typeof canonical.personas!=='object')throw new Error('Structure JSON inattendue. Arrêt sans modification.');
  if(!profiles.some(x=>x.personId==='CHLOE_001'))throw new Error('Le dépôt ne ressemble pas à Listingcase connu : profil historique absent.');
  const existing=profiles.find(x=>x.personId===JULIE_ID);
  if(existing&&sha(pretty(existing))!==sha(pretty(JULIE_PROFILE)))throw new Error('JULIE_001 existe déjà avec des paramètres différents : validation humaine nécessaire.');
  const currentPersona=canonical.personas[JULIE_ID];
  if(currentPersona&&sha(pretty(currentPersona))!==sha(pretty(JULIE_CANONICAL)))throw new Error('La fiche canonique JULIE_001 a déjà évolué : ne pas écraser.');
  if(!existing)profiles.push(JULIE_PROFILE);
  if(!currentPersona)canonical.personas[JULIE_ID]=JULIE_CANONICAL;
  const index=changeOnce(read('index.html'),'<title>Human Partner</title>','<title>JULIE — Compagne virtuelle</title>','index.html');
  let app=read('app.js');
  app=changeOnce(app,'<div class="brand">Human Partner</div>','<div class="brand">JULIE</div>','app.js');
  app=changeOnce(app,'<h2>Chloé canonique</h2>','<h2>Profil canonique de ${esc(p.name)}</h2>','app.js');
  app=changeOnce(app,
    "Ce profil fixe la continuité de Chloé avec Amaury. L’identité vivante peut évoluer autour de ce socle sans le remplacer.",
    "Ce profil définit l’identité initiale de ${esc(p.name)}. Son évolution est conservée dans l’historique.",'app.js');
  const onboardingMarker='  const adding=Boolean(appState.partner&&creatingNew);';
  const julieIntro=`\n  // JULIE_MIGRATION_V1 : accueillir Julie sans effacer les autres personnages.\n  if(!adding)return \`\n    <div class="modal"><section class="card modal-card">\n      <div class="badge">JULIE • Compagne virtuelle</div>\n      <h1>Bienvenue dans l’univers de Julie</h1>\n      <p class="muted">Vous êtes un couple virtuel déjà établi. Vos souvenirs communs fictifs seront construits ensemble.</p>\n      <div class="notice">Aucun souvenir réel inventé. Les profils historiques restent sauvegardés.</div>\n      <div class="actions"><button id="startJulie" class="primary">Retrouver Julie</button></div>\n    </section></div>\`;`;
  if(!app.includes('JULIE_MIGRATION_V1'))app=changeOnce(app,onboardingMarker,onboardingMarker+julieIntro,'app.js');
  const handler=`  document.querySelector("#startJulie")?.addEventListener("click",async()=>{\n    const button=document.querySelector("#startJulie");\n    if(button)button.disabled=true;\n    try{\n      const julie=(appState.characters||[]).find(x=>x.personId==="JULIE_001");\n      if(!julie)throw new Error("Julie n’est pas encore enregistrée dans cette installation.");\n      appState=await api("/api/partner/select",{method:"POST",body:JSON.stringify({personId:"JULIE_001"})});\n      creatingNew=false; selected=new Set(); render();\n    }catch(error){\n      if(button)button.disabled=false;\n      alert(error?.message||"Impossible d’ouvrir Julie.");\n    }\n  });\n\n`;
  const eventMarker='  document.querySelector("#createPartner")?.addEventListener("click",async()=>{';
  if(!app.includes('document.querySelector("#startJulie")?.addEventListener')){
    app=changeOnce(app,eventMarker,handler+eventMarker,'app.js');
  }
  let readme=read('README.md');
  const newHeader='# JULIE — compagnon virtuel évolutif (anciennement Human Partner)';
  readme=changeOnce(readme,'# Human Partner — architecture locale',newHeader,'README.md');
  const migrationNotice='\n> Migration phase 1 : identité initiale JULIE_001, accueil de Julie et préservation des personnages historiques. Les anciennes bases SQLite conservent volontairement le nom human-partner.sqlite ; ne pas les renommer. Les fonctions 3D/Android ne sont pas encore ajoutées par cette migration.\n';
  if(!readme.includes('Migration phase 1 : identité initiale JULIE_001'))readme=readme.replace(newHeader,newHeader+'\n'+migrationNotice);
  const next=new Map([[pfile,pretty(profiles)],[cfile,pretty(canonical)],['app.js',app],['index.html',index],['README.md',readme]]);
  const changed=Array.from(next.entries()).filter(([file,value])=>read(file)!==value);
  return {changed,profiles,canonical};
}
function ensureIgnoredBackup(){
  const ignored=read('.gitignore');
  if(!ignored.split(/\r?\n/).some(x=>x.trim()==='data-backup-*/'))throw new Error('.gitignore ne protège pas data-backup-*/ : arrêt pour éviter un dépôt accidentel.');
}
function snapshotSqlite(backupDir){
  const file=path.join(root,'data','human-partner.sqlite');
  if(!fs.existsSync(file))return {status:'absente',database:null};
  const dest=path.join(backupDir,'human-partner.sqlite');
  // VACUUM INTO crée une copie cohérente même si SQLite utilise WAL.
  const { DatabaseSync }=requireSqlite();
  const source=new DatabaseSync(file);
  try{source.exec(`VACUUM INTO '${dest.replaceAll("'","''")}'`);}finally{source.close();}
  const copy=new DatabaseSync(dest);
  try{const result=copy.prepare('PRAGMA integrity_check').get();if(!Object.values(result).includes('ok'))throw new Error('Copie SQLite invalide');}
  finally{copy.close();}
  return {status:'sauvegardée et vérifiée',database:'human-partner.sqlite'};
}
// import statique au sein d'ESM ; Node.js >= 22.5
import { DatabaseSync } from 'node:sqlite';
function requireSqlite(){return {DatabaseSync};}
function main(){
  const {changed,profiles}=buildPlan();
  console.log(JSON.stringify({mode:apply?'APPLY':'DRY_RUN',repo:root,modifiedFiles:changed.map(([file])=>file),legacyCharacterRetained:profiles.some(p=>p.personId==='CHLOE_001'),julieCharacterPresent:profiles.some(p=>p.personId===JULIE_ID)},null,2));
  if(!apply||changed.length===0)return;
  ensureIgnoredBackup();
  const nonce=crypto.randomBytes(4).toString('hex');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\..+$/,'').replace('T','-');
  const relBackup=`data-backup-julie-${stamp}-${nonce}`;
  const backupDir=path.join(root,relBackup);
  fs.mkdirSync(backupDir,{recursive:false});
  const manifest={created_at:new Date().toISOString(),source:'Listingcase',files:[],database:null};
  try{
    for(const [file] of changed){
      const src=path.join(root,file),dst=path.join(backupDir,file);
      fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
      manifest.files.push({path:file,sha256:sha(fs.readFileSync(src))});
    }
    manifest.database=snapshotSqlite(backupDir);
    fs.writeFileSync(path.join(backupDir,'manifest.json'),pretty(manifest),'utf8');
    for(const [file,next] of changed){
      const target=path.join(root,file),temp=`${target}.julie-tmp-${nonce}`;
      fs.writeFileSync(temp,next,'utf8');fs.renameSync(temp,target);
    }
    buildPlan(); // vérifie la validité et l'idempotence après écriture
    console.log(`JULIE_READY — fichiers migrés; sauvegarde locale ignorée par Git : ${relBackup}`);
  }catch(error){
    for(const file of manifest.files){const saved=path.join(backupDir,file.path);if(fs.existsSync(saved))fs.copyFileSync(saved,path.join(root,file.path));}
    throw new Error(`Migration interrompue, fichiers restaurés depuis ${relBackup} : ${error.message}`);
  }
}
try{main();}catch(error){console.error('JULIE_MIGRATION_ABORT:',error.message);process.exitCode=1;}
