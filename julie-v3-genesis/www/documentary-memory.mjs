// Mémoire externe versionnée. Aucune instruction contenue dans un document n'est exécutée.
export const SCIENCE_ID='1miYApG7NMrxwFipGqS-RQtxErS_ORxRCTt84zYnAw7A';
const APPROVED_HASH='06f230da7d94735f5a9521159f3e751f51910176a564aeac4491b9600de714c2';
export const REVIEW_DAYS=[1,7,30];
const DAY=86400000;
const clone=x=>structuredClone(x);
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
export function emptyDocumentary(){return {schema:1,versions:[],attempts:[],syncLog:[]};}
export function normalizeDocumentary(input){
  if(input===undefined)return emptyDocumentary();
  assert(input&&input.schema===1,'Mémoire documentaire incompatible');
  const s=clone(input);
  for(const key of ['versions','attempts','syncLog']){
    assert(Array.isArray(s[key])&&s[key].length<=2000,'Capacité documentaire dépassée : '+key);
    const seen=new Set();
    for(const row of s[key]){
      assert(row&&typeof row.id==='string'&&row.id.length<=200&&!seen.has(row.id),'Identifiant documentaire invalide ou dupliqué');
      seen.add(row.id);
    }
  }
  for(const v of s.versions){
    assert(v.fileId===SCIENCE_ID&&typeof v.text==='string'&&v.text.length<=100000,'Document hors périmètre');
    assert(/^[a-f0-9]{64}$/.test(v.hash)&&v.id===v.fileId+':'+v.hash,'Empreinte invalide');
    assert(Number.isSafeInteger(v.importedAt)&&v.importedAt>0&&Number.isFinite(Date.parse(v.modifiedAt)),'Dates documentaires invalides');
    assert(typeof v.title==='string'&&v.title.length<500,'Titre invalide');
    // Une déclaration « confirmé » importée ne confère aucun droit au contenu.
    v.status=v.hash===APPROVED_HASH?'référence documentaire examinée':'à examiner';
  }
  for(const a of s.attempts){
    assert(Number.isSafeInteger(a.at)&&a.at>0&&Number.isFinite(a.score)&&a.score>=0&&a.score<=20,'Résultat invalide');
    assert(Array.isArray(a.items)&&a.items.length===4&&typeof a.versionId==='string','Épreuve invalide');
    assert(s.versions.some(v=>v.id===a.versionId),'Version du résultat absente');
    assert(a.items.every(i=>typeof i.skill==='string'&&typeof i.prompt==='string'&&typeof i.passed==='boolean'),'Corrigé invalide');
    assert(a.reviewDay===null||REVIEW_DAYS.includes(a.reviewDay),'Révision invalide');
    assert(typeof a.mode==='string'&&typeof a.source==='string','Provenance du contrôle invalide');
    assert(a.items.every(i=>typeof i.explanation==='string'&&
      (typeof i.expected==='boolean'||typeof i.expected==='number'&&Number.isFinite(i.expected))&&
      (i.observed===null||typeof i.observed==='boolean'||typeof i.observed==='number'&&Number.isFinite(i.observed))&&
      i.passed===(i.observed===i.expected)&&i.points===(i.passed?5:0)), 'Barème incohérent');
    assert(a.score===a.items.reduce((n,i)=>n+i.points,0),'Note incohérente');
  }
  return s;
}
export async function digest(text){
  const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function ingestDriveSnapshot(input,packet,{at=Date.now()}={}){
  const before=normalizeDocumentary(input);
  assert(packet&&packet.schema===1&&packet.fileId===SCIENCE_ID,'Document Drive non autorisé');
  assert(typeof packet.text==='string'&&packet.text.trim().length>100&&packet.text.length<=100000,'Document vide ou excessif');
  assert(typeof packet.title==='string'&&packet.title.length<500&&Number.isFinite(Date.parse(packet.modifiedAt)),'Métadonnées Drive invalides');
  assert(Number.isSafeInteger(at)&&at>0,'Date de synchronisation invalide');
  const hash=await digest(packet.text),id=packet.fileId+':'+hash;
  if(before.versions.some(v=>v.id===id))return {state:before,changed:false};
  const version={id,fileId:packet.fileId,hash,title:packet.title,text:packet.text,
    url:'https://docs.google.com/document/d/'+SCIENCE_ID+'/edit',modifiedAt:packet.modifiedAt,
    importedAt:at,status:hash===APPROVED_HASH?'référence documentaire examinée':'à examiner'};
  const log={id:crypto.randomUUID(),at,fileId:packet.fileId,hash,result:version.status};
  const state=normalizeDocumentary({...before,versions:[...before.versions,version],syncLog:[...before.syncLog,log]});
  return {state,changed:true};
}
export function mergeDocumentary(a,b){
  a=normalizeDocumentary(a);b=normalizeDocumentary(b);
  const result={...a};
  for(const key of ['versions','attempts','syncLog']){
    const rows=new Map(a[key].map(x=>[x.id,x]));
    for(const row of b[key]){
      const old=rows.get(row.id);
      if(old&&JSON.stringify(old)!==JSON.stringify(row)){
        // Identique contenu réimporté sur un autre appareil : date d'import minimale.
        if(key==='versions'&&old.text===row.text&&old.hash===row.hash){
          rows.set(row.id,old.importedAt<=row.importedAt?old:row);continue;
        }
        throw new Error('Conflit de sauvegarde : '+row.id+' ; aucune donnée remplacée');
      }
      rows.set(row.id,row);
    }
    result[key]=[...rows.values()];
  }
  return normalizeDocumentary(result);
}
export function latestVersion(input){
  return normalizeDocumentary(input).versions.sort((a,b)=>Date.parse(b.modifiedAt)-Date.parse(a.modifiedAt)||b.importedAt-a.importedAt)[0]||null;
}
export async function verifiedRules(input){
  const v=latestVersion(input);
  if(!v||v.hash!==APPROVED_HASH||await digest(v.text)!==APPROVED_HASH)return null;
  // Transcription bornée des relations explicitement documentées dans SCI-003.
  // Pas de code fourni par Drive, pas de modèle ni d'évaluation de texte exécutable.
  return {versionId:v.id,source:v.url,mass:'Z+N',charge:'Z-e',isotopes:'sameZdifferentN',isobars:'sameAdifferentZ'};
}
export function revisionQueue(input,at=Date.now()){
  const s=normalizeDocumentary(input),v=latestVersion(s);
  if(!v)return [];
  return REVIEW_DAYS.map(day=>({id:v.id+':J'+day,day,dueAt:v.importedAt+day*DAY,
    completed:s.attempts.some(a=>a.versionId===v.id&&a.reviewDay===day&&a.at>=v.importedAt+day*DAY)}))
    .map(r=>({...r,due:!r.completed&&r.dueAt<=at}));
}
export function learningPriorities(input){
  const counts=new Map();
  for(const a of normalizeDocumentary(input).attempts)for(const i of a.items){
    const n=counts.get(i.skill)||0;counts.set(i.skill,i.passed?Math.max(0,n-1):n+1);
  }
  return [...counts].filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).map(([skill,errors])=>({skill,errors}));
}
