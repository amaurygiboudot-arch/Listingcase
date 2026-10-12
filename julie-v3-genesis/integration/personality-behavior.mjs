import {buildPrompt} from '../www/local-conversation.mjs';
import {writeFileSync} from 'node:fs';
const history=[{role:'user',text:"Tu m'aimes ?"},{role:'julie',text:"Je suis une IA et je n'ai pas d'émotions, donc je ne peux pas aimer ou ne pas aimer quelqu'un."}];
const text="Coucou chérie est-ce que tu m'aimes";
const prompt=buildPrompt(history,text);
const result=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen2.5:1.5b',prompt,raw:true,stream:false,options:{temperature:0,num_ctx:2048,num_predict:120,stop:['<|im_end|>']}})}).then(r=>r.json());
writeFileSync('../personality-behavior-baseline.json',JSON.stringify({prompt,result},null,2));
console.log(JSON.stringify({response:result.response,error:result.error,total_duration:result.total_duration}));
