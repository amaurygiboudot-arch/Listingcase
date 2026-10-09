// JULIE_001 — données de démonstration locales, sans suppression silencieuse.
// Module pur : aucun accès au stockage ni au réseau.
export const JULIE_ID = 'JULIE_001';
export const STATE_SCHEMA = 2;
export const MAX_STATE_BYTES = 8_000_000;
const qualities=new Set(['eco','balanced','high']);
const roles=new Set(['user','julie','partner']);

const bytes=value=>new TextEncoder().encode(value).length;
export function stateByteCount(state){return bytes(JSON.stringify(state));}
export function checkCapacity(state){
  const size=stateByteCount(state);
  if(size>MAX_STATE_BYTES)throw new Error('Mémoire locale pleine : exporte les données avant de continuer. Aucun souvenir n’a été effacé.');
  return size;
}
export function createInitialState(now=Date.now()){
  return {id:JULIE_ID,schemaVersion:STATE_SCHEMA,version:'0.3.1',
    firstOpened:now,quality:'balanced',deletedBefore:0,messages:[],memories:[]};
}
function stamp(v){return Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;}
function validateMessages(messages){
  if(!Array.isArray(messages))throw new Error('Historique de messages invalide');
  for(const m of messages){
    if(!m||typeof m!=='object'||!roles.has(m.role)||typeof m.text!=='string'||!Number.isFinite(Number(m.at)))
      throw new Error('Export contenant un message incompatible : aucune donnée importée');
  }
}
function validateMemories(memories){
  if(!Array.isArray(memories))throw new Error('Historique de souvenirs invalide');
  for(const m of memories){
    if(!m||typeof m!=='object'||typeof m.text!=='string'||!Number.isFinite(Number(m.at)))
      throw new Error('Export contenant un souvenir incompatible : aucune donnée importée');
  }
}
export function parseJulieState(raw,{allowEmpty=false}={}){
  if((raw===null||raw===undefined||raw==='')&&allowEmpty)return createInitialState();
  const input=typeof raw==='string'?JSON.parse(raw):raw;
  if(!input||typeof input!=='object'||input.id!==JULIE_ID)
    throw new Error('Cet export ne correspond pas à l’identité JULIE_001');
  validateMessages(input.messages);validateMemories(input.memories);
  const result={...input,id:JULIE_ID,schemaVersion:STATE_SCHEMA,
    version:'0.3.1',firstOpened:stamp(input.firstOpened)||Date.now(),
    deletedBefore:stamp(input.deletedBefore),
    quality:qualities.has(input.quality)?input.quality:'balanced',
    // Garder les champs inconnus : une mise à jour ne doit pas effacer des données futures.
    messages:input.messages.map(m=>({...m,role:m.role==='partner'?'julie':m.role})),
    memories:input.memories.map(m=>({...m}))};
  checkCapacity(result);
  return result;
}
const msgKey=m=>JSON.stringify([m.role,m.at,m.text]);
const memKey=m=>JSON.stringify([m.kind||'',m.at,m.text]);
export function mergeImport(current,external){
  const before=parseJulieState(current);
  const incoming=parseJulieState(external);
  const cutoff=before.deletedBefore;
  const msgSeen=new Set(before.messages.map(msgKey));
  const memSeen=new Set(before.memories.map(memKey));
  const messages=before.messages.map(m=>({...m}));
  const memories=before.memories.map(m=>({...m}));
  let blocked=0,addedMessages=0,addedMemories=0;
  for(const item of incoming.messages){
    const m={...item};
    if(cutoff>0&&stamp(m.at)<=cutoff){blocked++;continue;}
    const k=msgKey(m);
    if(!msgSeen.has(k)){messages.push(m);msgSeen.add(k);addedMessages++;}
  }
  for(const item of incoming.memories){
    const m={...item};
    if(cutoff>0&&stamp(m.at)<=cutoff){blocked++;continue;}
    const k=memKey(m);
    if(!memSeen.has(k)){memories.push(m);memSeen.add(k);addedMemories++;}
  }
  messages.sort((a,b)=>stamp(a.at)-stamp(b.at));
  memories.sort((a,b)=>stamp(a.at)-stamp(b.at));
  const merged={...before,messages,memories};
  checkCapacity(merged);
  return {state:merged,addedMessages,addedMemories,blocked};
}
export function eraseDemoHistory(current,at=Date.now()){
  const state=parseJulieState(current);
  return {...state,deletedBefore:Math.max(state.deletedBefore,stamp(at)),messages:[],memories:[]};
}
export function appendConversation(current,text,reply,at=Date.now()){
  if(typeof text!=='string'||!text.trim()||typeof reply!=='string')throw new Error('Message invalide');
  const state=parseJulieState(current);
  const messages=[...state.messages,{role:'user',text,at},{role:'julie',text:reply,at:at+1}];
  const memories=[...state.memories];
  if(/\b(j'aime|j’adore|j'adore|je préfère|je prefere|je déteste|je deteste)\b/i.test(text)){
    if(!memories.some(m=>m.text.toLocaleLowerCase('fr')===text.toLocaleLowerCase('fr')))
      memories.push({kind:'déclaration utilisateur',text,at,source:'message utilisateur',confidence:1});
  }
  const result={...state,messages,memories};checkCapacity(result);return result;
}
