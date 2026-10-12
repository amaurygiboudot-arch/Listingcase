import {DNA_FOUNDATION,DNA_TRAITS,DNA_STATES,dnaSnapshot,normalizeDNA,changeDNA} from './digital-dna.mjs';
export function mountDNA({getState,persist,canEdit}){
 const parent=document.querySelector('#memory-view');if(!parent)return;
 const root=document.createElement('section');root.id='dna-panel';root.className='card';
 root.style.cssText='margin:18px 0;padding:20px;border:1px solid #454955;border-radius:20px;background:#20232f;color:#eee';
 parent.prepend(root);let message='';
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function render(){
  root.replaceChildren();const dna=normalizeDNA(getState().dna),s=dnaSnapshot(dna);
  root.append(el('h2','ADN numérique de Julie'));
  root.append(el('p',DNA_FOUNDATION.id+' · socle fondateur conservé · '+s.revision+' évolution(s)'));
  root.append(el('p','Identité : Julie, femme virtuelle adulte. Couple virtuel établi avec Amaury. Mes goûts peuvent évoluer ; mes permissions réelles restent séparées.'));
  const list=el('ul');for(const [key,value] of Object.entries(s.traits))
   list.append(el('li',DNA_TRAITS[key]+' : '+(value===0?'profil fondateur':value<0?'expression plus discrète':'expression plus marquée')));
  root.append(list,el('p','État simulé : '+s.current.humeur+' · priorité : '+s.current.priorite+'. Les changements d’état expirent après 4 h.'));
  root.append(el('p','Cette première version évolue par des réglages explicites et justifiés. Une réponse du modèle ne change jamais seule mon ADN.'));
  const form=el('form'),field=el('select'),value=el('select'),reason=el('input'),button=el('button','Enregistrer l’évolution');
  field.id='dna-field';value.id='dna-value';reason.id='dna-reason';button.id='dna-save';
  field.setAttribute('aria-label','Élément à faire évoluer');value.setAttribute('aria-label','Nouvelle expression');
  reason.setAttribute('aria-label','Raison de cette évolution');reason.placeholder='Pourquoi cette évolution ?';reason.maxLength=240;reason.required=true;
  for(const [key,label] of Object.entries(DNA_TRAITS)){const o=el('option',label);o.value='trait:'+key;field.append(o);}
  for(const [key,label] of [['humeur','Humeur simulée'],['priorite','Priorité du moment']]){const o=el('option',label);o.value='state:'+key;field.append(o);}
  function options(){
   const [kind,key]=field.value.split(':');value.replaceChildren();
   const choices=kind==='trait'?[[-1,'Plus discrète'],[0,'Profil fondateur'],[1,'Plus marquée']]:DNA_STATES[key].map(x=>[x,x]);
   for(const [v,label] of choices){const o=el('option',label);o.value=String(v);value.append(o);}
   value.value=String(kind==='trait'?s.traits[key]:s.current[key]);
  }
  field.addEventListener('change',options);options();
  for(const n of [field,value,reason,button]){n.style.cssText='display:block;width:100%;box-sizing:border-box;margin:10px 0;padding:12px;border-radius:10px;background:#303746;color:white;border:1px solid #66736b';form.append(n);}
  button.type='submit';button.disabled=!canEdit();
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!canEdit()){message='Attends la fin de la réponse en cours.';render();return;}
   try{
    const [kind,key]=field.value.split(':');
    const next=changeDNA(getState().dna,{kind,key,value:kind==='trait'?Number(value.value):value.value,reason:reason.value});
    if(JSON.stringify(next)===JSON.stringify(normalizeDNA(getState().dna))){message='Aucun changement : cette valeur est déjà active.';render();return;}
    if(persist({...getState(),dna:next})){message='Évolution enregistrée et relue dans la mémoire locale.';render();}
    else {message='Sauvegarde non confirmée : aucune évolution annoncée.';render();}
   }catch(e){message=e.message;render();}
  });
  root.append(form);const status=el('p',message);status.id='dna-status';status.setAttribute('role','status');root.append(status);
  const details=el('details');details.append(el('summary','Historique des évolutions ('+dna.events.length+')'));
  for(const e of [...dna.events].reverse()){
   details.append(el('p',new Date(e.at).toLocaleString('fr-FR')+' — '+(DNA_TRAITS[e.key]||e.key)+' : '+e.value+' — '+e.reason+' — '+e.source));
  }
  root.append(details);
  root.append(el('small','Source : contrat d’identité JULIE et document maître, annexe 1.1. Ni ADN biologique ni conscience humaine.'));
 }
 document.addEventListener('julie-dna-refresh',render);render();
}
