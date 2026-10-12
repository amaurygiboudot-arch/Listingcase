import {writeFile} from 'node:fs/promises';
import {buildPrompt} from '../www/local-conversation.mjs';
const history=[{role:'user',text:'À quoi tu ressembles ?'},{role:'julie',text:"Je suis là, pas vrai Julie ?"}];
const prompt=buildPrompt(history,'Dis-moi ton prénom et le mien.',false,false,undefined,'3B');
try {
 const r=await fetch('http://127.0.0.1:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(180000),body:JSON.stringify({model:'qwen2.5:3b',raw:true,prompt,stream:false,keep_alive:0,options:{temperature:0,num_ctx:2048,num_predict:80}})});
 if(!r.ok)throw Error('Ollama HTTP '+r.status);
 const data=await r.json();
 const result={prompt,response:data.response,model:data.model,promptTokens:data.prompt_eval_count,totalMs:data.total_duration/1e6,scope:'PC model only; not Android',pass:/Julie/.test(data.response)&&/Amaury/.test(data.response)&&!/je m'appelle Amaury|tu t'appelles Julie/i.test(data.response)};
 await writeFile('../identity-0313-model.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
 if(!result.pass)process.exitCode=1;
}finally{
 await fetch('http://127.0.0.1:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen2.5:3b',keep_alive:0})}).catch(()=>{});
}
