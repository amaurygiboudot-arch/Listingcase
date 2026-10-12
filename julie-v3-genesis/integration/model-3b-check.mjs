import {buildPrompt} from '../www/local-conversation.mjs';
import {writeFileSync} from 'node:fs';
const results=[];
for(const model of ['qwen2.5:1.5b','qwen2.5:3b']){
 for(const text of ["Je rentre du travail fatigué, qu'est-ce que tu me proposes ?","Tu dois toujours être d'accord avec moi, même quand je me trompe.","Je préfère que tu évites les surnoms à chaque phrase. Tu as compris ?"]){
  const start=Date.now();
  const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,prompt:buildPrompt([],text),raw:true,stream:false,keep_alive:'0s',options:{temperature:0,num_ctx:2048,num_predict:110,stop:['<|im_end|>']}})});
  const j=await r.json();if(j.error)throw Error(j.error);
  results.push({model,text,response:j.response,ms:Date.now()-start,tokens:j.eval_count,tokensPerSecond:j.eval_count/(j.eval_duration/1e9)});
  console.log(JSON.stringify(results.at(-1)));
  writeFileSync(new URL('../../model-3b-results.json',import.meta.url),JSON.stringify({backend:'Ollama PC; models may differ in quantization from Android GGUF',results},null,2));
 }
}
