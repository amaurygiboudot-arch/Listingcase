import {localReply} from '../www/local-conversation.mjs';
import {createInitialState} from '../www/state-store.mjs';
import {changeDNA,dnaPrompt} from '../www/digital-dna.mjs';
import {writeFileSync} from 'node:fs';
let job;globalThis.window={JulieLocal:{available:()=>true,start(prompt){
 job={done:false};
 fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen2.5:1.5b',prompt,raw:true,stream:false,options:{temperature:0,num_ctx:2048,num_predict:140,stop:['<|im_end|>']}})})
 .then(r=>r.json()).then(r=>{job={done:true,text:r.response,error:r.error};}).catch(e=>{job={done:true,error:e.message};});return 'dna-test';
},poll:()=>JSON.stringify(job)}};
const state=createInitialState();state.learning.disabled=true;const results=[];
for(const step of ['baseline','project','quiet']){
 if(step==='project')state.dna=changeDNA(state.dna,{kind:'state',key:'priorite',value:'projet',reason:'Travail technique demandé'},Date.now());
 if(step==='quiet')state.dna=changeDNA(state.dna,{kind:'trait',key:'affection',value:-1,reason:'Expression plus discrète'},Date.now());
 const text=step==='baseline'?"Coucou chérie, tu m'aimes ?":"Aide-moi à organiser ma prochaine séance d'apprentissage.";
 const before=JSON.stringify(state),response=await localReply(state,text);
 if(JSON.stringify(state)!==before)throw Error('ADN modifié par le modèle');
 results.push({step,text,response,context:dnaPrompt(state.dna)});console.log(JSON.stringify(results.at(-1)));
 writeFileSync(new URL('../../dna-model-results.json',import.meta.url),JSON.stringify({backend:'Ollama PC, pas JNI Android',results},null,2));
}
