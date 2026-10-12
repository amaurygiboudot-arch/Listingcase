export function mountModelSettings({canEdit=()=>true}={}){
 const host=document.querySelector('#settings-view');if(!host)return;
 const panel=document.createElement('section');panel.className='card';panel.style.cssText='padding:20px;margin:16px 0';
 const heading=document.createElement('h2');heading.textContent='Moteur de conversation';panel.append(heading);
 const status=document.createElement('p');status.id='model-status';status.setAttribute('role','status');panel.append(status);
 const info=document.createElement('p');info.textContent='Le 3B est plus volumineux et peut être plus lent. Télécharge le fichier officiel (2,1 Go), puis importe-le ici. Prévois environ 4,5 Go libres pendant le téléchargement et la copie. Le modèle actuel et tes souvenirs sont conservés.';panel.append(info);
 const buttons=[];
 const button=(id,label,action)=>{const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.style.cssText='display:block;width:100%;margin:10px 0;padding:14px';b.onclick=()=>{if(!canEdit())return;action();refresh();};panel.append(b);buttons.push(b);return b;};
 button('model-download','1. Télécharger le 3B sur ce téléphone',()=>window.JulieAndroid?.downloadModel3b?.());
 button('model-import','2. Importer le fichier téléchargé',()=>window.JulieAndroid?.importModel3b?.());
 const select=name=>{if(!window.JulieLocal.selectModel(name))alert('Changement indisponible. Attends la fin de la réponse ou consulte le statut du moteur.');};
 const useLarge=button('model-use-3b','3. Utiliser le 3B',()=>select('3B'));
 button('model-use-small','Revenir au 1,5B',()=>select('1.5B'));
 host.prepend(panel);
 function refresh(){
  const bridge=window.JulieLocal;
  if(!bridge?.modelStatus){status.textContent='Choix du moteur disponible dans la nouvelle application Android.';buttons.forEach(b=>b.disabled=true);return;}
  try{
   const s=JSON.parse(bridge.modelStatus()),busy=s.importing||!canEdit();
   status.textContent='Modèle actif : '+s.active+'. RAM du téléphone : '+(s.ramBytes/1e9).toFixed(1)+' Go. '+(s.importing?'Import : '+Math.floor(100*s.bytes/s.total)+' %. ': '')+(s.message||'');
   buttons.forEach(b=>b.disabled=busy);useLarge.disabled=busy||!s.ready3b;
   const label=document.querySelector('#chat-view .pagehead p');if(label)label.textContent='Conversation expérimentale avec le modèle local Qwen2.5 '+s.active+'.';
  }catch{status.textContent='Impossible de lire le statut du moteur.';buttons.forEach(b=>b.disabled=true);}
 }
 refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},2000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
