export const normalizeDialogue=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function isStopRequest(text){
 return /^(?:arrete|stop|ca suffit|arrete de repeter|ne repete plus)(?: s il te plait| stp)?$/.test(normalizeDialogue(text));
}
export function controlReply(text){return isStopRequest(text)?"D’accord, j’arrête.":null;}
export function repetitionContext(messages){
 const recent=messages.slice(-8),counts=new Map();
 for(const m of recent)if(m.role!=='user'){const k=normalizeDialogue(m.text);counts.set(k,(counts.get(k)||0)+1);}
 let start=0;
 for(let i=0;i<recent.length;i++)if(recent[i].role==='user'&&isStopRequest(recent[i].text))start=i+1;
 return recent.slice(start).filter(m=>m.role==='user'||(counts.get(normalizeDialogue(m.text))||0)<2).slice(-4);
}
export function checkDialogueReply(reply,messages,text){
 const key=normalizeDialogue(reply);
 const same=messages.slice(-8).filter(m=>m.role!=='user'&&normalizeDialogue(m.text)===key);
 if(key.length>30&&same.length>=2)throw Error('Le moteur répète une ancienne réponse. Aucun nouveau message de Julie enregistré.');
 return reply.replace(/^Je suis désolé(?=[,.!\s]|$)/u,'Je suis désolée');
}
