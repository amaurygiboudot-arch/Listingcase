// Module pur — recherche Google et connaissances externes, sans écraser les souvenirs.
export const GOOGLE_SEARCH_ROOT='https://www.google.com/search';
export const RESEARCH_LIMIT=50;
export const MAX_SOURCE_TEXT=900;
export function cleanGoogleQuery(value){
  if(typeof value!=='string')throw new Error('Recherche Google invalide.');
  const query=value.replace(/\s+/g,' ').trim();
  if(!query||query.length>180)throw new Error('La recherche doit contenir entre 1 et 180 caractères.');
  return query;
}
export function googleSearchUrl(value){
  const u=new URL(GOOGLE_SEARCH_ROOT);
  u.searchParams.set('q',cleanGoogleQuery(value));
  return u.href;
}
export function requestedGoogleSearch(value){
  const text=String(value||'').trim();
  const match=text.match(/^(?:cherche(?:\s+sur\s+google)?|recherche(?:\s+sur\s+google)?|fais\s+une\s+recherche(?:\s+google)?|google)\s*(?:[:\-]\s*|\s+)(.+)$/i);
  if(!match)return null;
  try{return cleanGoogleQuery(match[1]);}catch{return null;}
}
export function normalizeSourceUrl(raw){
  if(typeof raw!=='string'||raw.length>2048)throw new Error('Lien Web invalide.');
  let url;
  try{url=new URL(raw.trim());}catch{throw new Error('Lien Web invalide.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname||url.hostname.length>253)
    throw new Error('Seuls les liens publics HTTPS sans identifiant ni port personnalisé sont acceptés.');
  if(/(^localhost$|\.localhost$|\.local$|\.internal$|\.test$|\.invalid$)/i.test(url.hostname))
    throw new Error('Adresse locale non autorisée.');
  url.hash='';
  return url.href;
}
export function normalizeResearchResult(result,at=Date.now()){
  if(!result||result.ok!==true)throw new Error(String(result?.error||'Lecture impossible.'));
  const url=normalizeSourceUrl(result.url);
  const title=String(result.title||'Page sans titre').replace(/\s+/g,' ').trim().slice(0,160);
  const excerpt=String(result.excerpt||'').replace(/\s+/g,' ').trim().slice(0,MAX_SOURCE_TEXT);
  if(!excerpt)throw new Error('Cette page ne fournit pas de texte lisible.');
  return {kind:'information recherchée',title,url,excerpt,at,
    source:'page Web HTTPS',confidence:'non vérifiée',verified:false};
}
export function addResearchKnowledge(state,result){
  if(!state||typeof state!=='object')throw new Error('État invalide.');
  const previous=Array.isArray(state.research)?state.research:[];
  if(previous.length>=RESEARCH_LIMIT)throw new Error('Limite de sources atteinte : exporte ou supprime des entrées avant d’en ajouter.');
  if(previous.some(x=>x.url===result.url&&x.excerpt===result.excerpt))
    return {...state,research:previous.slice()};
  return {...state,research:[...previous,result]};
}

/** Une URL HTTPS explicitement envoyée dans une conversation peut être lue sans onglet supplémentaire. */
export function requestedSourceFromConversation(text){
  if(typeof text!=='string'||text.length>500)return null;
  const matches=text.match(/https:\/\/[^\s<>"']+/gi);
  if(!matches||matches.length!==1)return null;
  let candidate=matches[0].replace(/[),.;!?]+$/,'');
  try{return normalizeSourceUrl(candidate);}catch{return null;}
}

/** Recherche autonome seulement pour des demandes explicites et non ciblées Google. */
export function requestedPublicSearch(value){
  const text=String(value||'').trim();
  if(requestedGoogleSearch(text))return null;
  const match=text.match(/^(?:(?:julie[,\s]+)?(?:cherche|recherche|renseigne[- ]toi|trouve des informations|fais une recherche)\s+(?:sur\s+|à propos de\s+|au sujet de\s+|des informations sur\s+)?)(.{3,180})$/i);
  if(!match)return null;
  try{return cleanGoogleQuery(match[1]);}catch{return null;}
}
export function normalizePublicSearchResult(value){
  if(!value||value.ok!==true||value.engine!=='Wikimedia Action API'||!Array.isArray(value.results))
    throw new Error(value?.error||'Recherche publique indisponible.');
  return {query:cleanGoogleQuery(value.query),results:value.results.slice(0,3).map(x=>{
    const url=normalizeSourceUrl(x.url);
    if(new URL(url).hostname!=='fr.wikipedia.org')throw new Error('Source non autorisée.');
    return {title:String(x.title||'').slice(0,160),
      excerpt:String(x.excerpt||'').replace(/\s+/g,' ').slice(0,460),url};
  })};
}
