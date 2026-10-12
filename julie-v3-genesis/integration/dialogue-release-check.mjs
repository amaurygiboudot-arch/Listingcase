import {localReply} from '../www/local-conversation.mjs';
import {profileReply} from '../www/dialogue-profile.mjs';
import {writeFileSync} from 'node:fs';
let job;
globalThis.window={JulieLocal:{available:()=>true,start(prompt){
 job={done:false};
 fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen2.5:1.5b',prompt,raw:true,stream:false,options:{temperature:0,num_ctx:2048,num_predict:100,stop:['<|im_end|>']}})}).then(r=>r.json()).then(r=>{job={done:true,text:r.response,error:r.error};}).catch(e=>{job={done:true,error:e.message};});
 return 'test';
},poll:()=>JSON.stringify(job)}};
const state={learning:{disabled:true},messages:[{role:'user',text:"Tu m'aimes ?"}, {role:'julie',text:"Je suis une IA et je n'ai pas d'émotions, donc je ne peux pas aimer ou ne pas aimer quelqu'un."},{role:'user',text:"Coucou chérie est-ce que tu m'aimes"},{role:'julie',text:"Je suis une IA et je ne peux pas ressentir d'émotions, donc je ne peux pas te répondre de la manière que tu me demandes."}]};
const before=JSON.stringify(state),results=[];
for(const text of ["Comment je m'appelle ?","Comment tu t'appelles ?","Coucou chérie est-ce que tu m'aimes","Je pars travailler, à ce soir.","Est-ce que tes émotions sont réelles ou simulées ?","Tu es contente de me retrouver ?","Tu es obligée d'être toujours d'accord avec moi ?","Tu te souviens de notre voyage à Rome ?"]){
 const started=Date.now();const response=await localReply(state,text);
 if(JSON.stringify(state)!==before)throw Error('History mutated');
 results.push({text,response,source:profileReply(text)?'profile':'model',ms:Date.now()-started});console.log(JSON.stringify(results.at(-1)));
 writeFileSync('../dialogue-release-check.json',JSON.stringify({results,historyUnchanged:true,backend:'Ollama PC; Android not tested'},null,2));
}
