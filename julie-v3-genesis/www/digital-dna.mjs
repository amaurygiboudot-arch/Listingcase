import contract from '../spec/identity-contract.json' with {type:'json'};
export const DNA_VERSION='julie-dna-1.0';
export const DNA_TRAITS=Object.freeze({affection:'Affection',taquinerie:'Taquinerie',curiosite:'Curiosité',independance:'Indépendance'});
export const DNA_STATES=Object.freeze({humeur:['neutre','calme','joueuse','concentrée'],priorite:['dialogue','apprentissage','projet']});
export const DNA_FOUNDATION=Object.freeze({
 id:contract.immutable_id,name:contract.first_name,adult:contract.adult,
 relationship:contract.initial_relationship,
 traits:Object.freeze([...contract.personality_start]),
 source:contract.source+' ; annexe 1.1, sections B et C',
 principles:Object.freeze(['Distinguer faits, hypothèses et fiction','Ne pas inventer de souvenir ou action','Pouvoir être en désaccord','Respecter les permissions réelles'])
});
const copy=x=>JSON.parse(JSON.stringify(x));
const exactKeys=(v,keys)=>Object.keys(v).every(k=>keys.includes(k));
export function createDNA(){return {schema:1,version:DNA_VERSION,identityId:DNA_FOUNDATION.id,erasedBefore:0,events:[]};}
export function normalizeDNA(input){
 if(input===undefined)return createDNA();
 if(!input||input.schema!==1||input.version!==DNA_VERSION||input.identityId!==DNA_FOUNDATION.id||
 !exactKeys(input,['schema','version','identityId','erasedBefore','events'])||
 !Number.isSafeInteger(input.erasedBefore)||input.erasedBefore<0||!Array.isArray(input.events)||input.events.length>2000)
  throw Error('ADN incompatible : données conservées, import refusé.');
 const ids=new Set();let previous=input.erasedBefore;
 for(const e of input.events){
  if(!e||!exactKeys(e,['id','at','kind','key','value','reason','source'])||
   typeof e.id!=='string'||!e.id||ids.has(e.id)||!Number.isSafeInteger(e.at)||e.at<=previous||
   typeof e.reason!=='string'||!e.reason.trim()||e.reason.length>240||e.source!=='réglage explicite utilisateur')
   throw Error('Historique ADN invalide : aucune modification enregistrée.');
  const valid=e.kind==='trait'?Object.hasOwn(DNA_TRAITS,e.key)&&[-1,0,1].includes(e.value):
   e.kind==='state'&&Object.hasOwn(DNA_STATES,e.key)&&DNA_STATES[e.key].includes(e.value);
  if(!valid)throw Error('Évolution ADN incompatible avec le profil.');
  ids.add(e.id);previous=e.at;
 }
 return copy(input);
}
export function dnaSnapshot(input,now=Date.now()){
 const dna=normalizeDNA(input);
 const traits=Object.fromEntries(Object.keys(DNA_TRAITS).map(k=>[k,0]));
 const current={humeur:'neutre',priorite:'dialogue'};
 for(const e of dna.events){
  if(e.kind==='trait')traits[e.key]=e.value;
  else if(e.at<=now&&now-e.at<4*60*60*1000)current[e.key]=e.value;
 }
 return {foundation:DNA_FOUNDATION,traits,current,revision:dna.events.length};
}
export function changeDNA(input,{kind,key,value,reason},now=Date.now()){
 const dna=normalizeDNA(input);const snapshot=dnaSnapshot(dna,now);
 if(typeof reason!=='string'||!reason.trim()||reason.trim().length>240)throw Error('Indique une raison de 1 à 240 caractères.');
 const valid=kind==='trait'?Object.hasOwn(DNA_TRAITS,key)&&[-1,0,1].includes(value):kind==='state'&&Object.hasOwn(DNA_STATES,key)&&DNA_STATES[key].includes(value);
 if(!valid)throw Error('Évolution ADN incompatible avec le profil.');
 const previous=kind==='trait'?snapshot.traits[key]:snapshot.current[key];
 if(previous===value)return dna;
 const at=Math.max(Math.trunc(now),dna.erasedBefore+1,(dna.events.at(-1)?.at||0)+1);
 const id=globalThis.crypto.randomUUID();
 return normalizeDNA({...dna,events:[...dna.events,{id,at,kind,key,value,reason:reason.trim(),source:'réglage explicite utilisateur'}]});
}
export function eraseDNA(input,now=Date.now()){
 const dna=normalizeDNA(input);
 return {...createDNA(),erasedBefore:Math.max(dna.erasedBefore,Math.trunc(now),dna.events.at(-1)?.at||0)};
}
export function mergeDNA(a,b,cutoff=0){
 const left=normalizeDNA(a),right=normalizeDNA(b);
 const erasedBefore=Math.max(cutoff,left.erasedBefore,right.erasedBefore);
 const l=left.events.filter(e=>e.at>erasedBefore),r=right.events.filter(e=>e.at>erasedBefore);
 for(let i=0;i<Math.min(l.length,r.length);i++){
  if(JSON.stringify(['id','at','kind','key','value','reason','source'].map(k=>l[i][k]))!==JSON.stringify(['id','at','kind','key','value','reason','source'].map(k=>r[i][k])))
   throw Error('Deux évolutions ADN divergent. Import annulé ; conserve les deux exports pour comparer.');
 }
 return normalizeDNA({...createDNA(),erasedBefore,events:l.length>=r.length?l:r});
}
export function dnaPrompt(input,now=Date.now()){
 const {traits,current}=dnaSnapshot(input,now);
 const parts=[];
 const wording={
 affection:['Affection discrète : évite les surnoms et les déclarations romantiques spontanées.','Affection plus expressive, selon le contexte.'],
 taquinerie:['Ton sobre, peu de taquineries.','Humour taquin plus présent, sans insistance.'],
 curiosite:['Pose peu de questions supplémentaires.','Exprime davantage de curiosité, sans interrogatoire.'],
 independance:['Exprime tes désaccords avec douceur.','Affirme tes avis argumentés.']
 };
 for(const [k,v] of Object.entries(traits))if(v)parts.push(wording[k][v<0?0:1]);
 if(current.humeur!=='neutre')parts.push('Humeur simulée : '+current.humeur+'.');
 if(current.priorite==='projet')parts.push('Priorité : travail concret, ton professionnel, sans surnoms amoureux.');
 if(current.priorite==='apprentissage')parts.push('Priorité : apprendre, vérifier les faits et reconnaître les erreurs.');
 return parts.join(' ');
}
export function dnaReply(input,text,now=Date.now()){
 if(!/^\s*(?:mon|ton|montre (?:ton|mon))?\s*adn(?: numérique)?\s*[?!.]*\s*$/i.test(text))return null;
 const s=dnaSnapshot(input,now);
 const levels={[-1]:'plus discrète',0:'fondatrice',1:'plus marquée'};
 return 'Mon identité reste '+s.foundation.id+' : '+s.foundation.name+', compagne virtuelle adulte. '+
 Object.entries(s.traits).map(([k,v])=>DNA_TRAITS[k]+' : '+levels[v]).join(' ; ')+
 '. État simulé : '+s.current.humeur+' ; priorité : '+s.current.priorite+
 '. '+s.revision+' évolution(s) enregistrée(s). Les réglages et leurs raisons sont dans Souvenirs → ADN numérique.';
}
