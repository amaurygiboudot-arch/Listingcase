// Import contrôlé des comptes rendus de recherche provenant de ChatGPT.
// Aucune connexion cachée au compte ChatGPT, aucun accès à ses conversations.
// Format JSON autonome : pas de mémoire privée ni de consigne d'exécution.
export const MAX_IMPORTED_RESEARCH=100;
const MAX_REPORT_LENGTH=4000;
export function parseChatGPTResearch(input,at=Date.now()){
  if(typeof input!=='string'||input.length>18000)throw new Error('Compte rendu trop volumineux.');
  let parsed;
  try{parsed=JSON.parse(input);}catch{throw new Error('Colle un compte rendu de recherche au format JSON.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
     parsed.type!=='julie.research.v1'||parsed.origin!=='chatgpt')throw new Error('Format de recherche ChatGPT incompatible.');
  const title=String(parsed.title||'').trim(),summary=String(parsed.summary||'').trim();
  if(!title||title.length>160||!summary||summary.length>MAX_REPORT_LENGTH)
    throw new Error('Le titre ou le résumé doit être renseigné dans les limites prévues.');
  if(!Array.isArray(parsed.sources)||parsed.sources.length>12)
    throw new Error('Liste de sources invalide.');
  const sources=parsed.sources.map(x=>{
    if(!x||typeof x!=='object'||typeof x.url!=='string')throw new Error('Source invalide.');
    const url=new URL(x.url);
    if(url.protocol!=='https:'||url.username||url.password||url.port||
       !url.hostname.includes('.')||/(^localhost$|\.local$|\.internal$|\.localhost$)/i.test(url.hostname))
       throw new Error('URL de source non publique.');
    const label=String(x.title||'').trim();
    if(label.length>160)throw new Error('Nom de source trop long.');
    return {title:label,url:url.href};
  });
  if(!Number.isFinite(at)||at<0)throw new Error('Date invalide.');
  return {kind:'recherche ChatGPT importée',origin:'chatgpt',title,summary,sources,
    at,confidence:'non vérifiée dans JULIE',verified:false};
}
export function validateImportedResearch(items){
  if(!Array.isArray(items)||items.length>MAX_IMPORTED_RESEARCH)
    throw new Error('Registre ChatGPT invalide.');
  for(const item of items){
    if(!item||item.kind!=='recherche ChatGPT importée'||item.origin!=='chatgpt'||
       typeof item.title!=='string'||item.title.length>160||
       typeof item.summary!=='string'||item.summary.length>MAX_REPORT_LENGTH||
       !Number.isFinite(Number(item.at))||!Array.isArray(item.sources)||item.sources.length>12)
       throw new Error('Recherche ChatGPT incompatible.');
    for(const source of item.sources){
      if(!source||typeof source.url!=='string'){
        throw new Error('Source ChatGPT invalide.');
      }
      // Réappliquer la même validation que pour les nouvelles entrées.
      parseChatGPTResearch(JSON.stringify({
        type:'julie.research.v1',origin:'chatgpt',title:item.title,
        summary:item.summary,sources:[source]
      }),Number(item.at));
    }
  }
}
export function addChatGPTResearch(state,entry){
  validateImportedResearch([entry]);
  const entries=Array.isArray(state?.externalResearch)?state.externalResearch:[];
  if(entries.some(x=>x.title===entry.title&&x.summary===entry.summary&&x.at===entry.at))
    return state;
  if(entries.length>=MAX_IMPORTED_RESEARCH)
    throw new Error('Registre plein : exporte tes recherches avant d’en ajouter.');
  return {...state,externalResearch:[...entries,entry]};
}
