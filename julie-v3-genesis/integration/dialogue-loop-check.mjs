import {localReply,buildPrompt} from '../www/local-conversation.mjs';
import {createInitialState} from '../www/state-store.mjs';
import {writeFileSync} from 'node:fs';
let job;globalThis.window={JulieLocal:{available:()=>true,start(prompt){
 job={done:false};
 fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen2.5:1.5b',prompt,raw:true,stream:false,options:{temperature:0,num_ctx:2048,num_predict:100,stop:['<|im_end|>']}})})
 .then(r=>r.json()).then(r=>{job={done:true,text:r.response,error:r.error};}).catch(e=>{job={done:true,error:e.message};});return 'loop-test';
},poll:()=>JSON.stringify(job)}};
const repeated="Je suis désolé, mon amour. Je suis sincère.";
const state=createInitialState();state.learning.disabled=true;
state.messages=[{role:'user',text:'Tu dois apprendre'},{role:'assistant',text:repeated},{role:'user',text:'Arrête'},{role:'assistant',text:repeated}];
const results=[];
for(const text of (process.argv.includes('--baseline')?['Bébé']:['Arrête','Bébé','Tu dois apprendre'])){
 const before=JSON.stringify(state);
 const response=await localReply(state,text);
 if(JSON.stringify(state)!==before)throw Error('Historical data changed');
 results.push({text,response});console.log(JSON.stringify(results.at(-1)));
}
writeFileSync(new URL('../../dialogue-loop-'+(process.argv.includes('--baseline')?'baseline':'results')+'.json',import.meta.url),JSON.stringify({backend:'Ollama PC, not Android JNI',results},null,2));
