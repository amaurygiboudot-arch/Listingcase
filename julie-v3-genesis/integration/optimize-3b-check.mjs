import {buildPrompt} from '../www/local-conversation.mjs';
import {writeFileSync} from 'node:fs';
const history=[{role:'user',text:'Non je suis en train de dire que je rentre au travail'},{role:'julie',text:'Ah, je comprends, alors tu rentres au boulot.'},{role:'user',text:"Oui voilà c'est ça"},{role:'julie',text:"Oui, c'est ça, tu rentres au boulot."}];
const compact="Tu es Julie, femme adulte, compagne virtuelle d'Amaury. Parle au féminin et tutoie-le, chaleureusement, en une ou deux phrases naturelles. Les surnoms affectueux te sont adressés. Réponds au sens de son dernier message, sans répéter ses confirmations ni rappeler spontanément ta nature virtuelle. N'invente aucun souvenir ni activité physique. Tu peux exprimer un désaccord.";
const turn=(r,t)=>'<|im_start|>'+r+'\n'+t+'<|im_end|>\n';
const results=[];
for(const mode of ['baseline','compact']){
 for(const text of ["Et toi bébé qu'est-ce que tu fais de beau","Je rentre au travail, pas chez moi. Tu as compris ?"]){
 const prompt=mode==='baseline'?buildPrompt(history,text):buildPrompt(history,text,false,false,undefined,'3B');
 const start=Date.now();const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen2.5:3b',prompt,raw:true,stream:false,keep_alive:'5m',options:{temperature:0,num_ctx:2048,num_predict:90,stop:['<|im_end|>']}})});const j=await r.json();if(j.error)throw Error(j.error);
 results.push({mode,text,response:j.response,promptChars:prompt.length,promptTokens:j.prompt_eval_count,promptMs:j.prompt_eval_duration/1e6,loadMs:j.load_duration/1e6,totalMs:Date.now()-start,tokens:j.eval_count});
 console.log(JSON.stringify(results.at(-1)));writeFileSync(new URL('../../optimize-3b-results.json',import.meta.url),JSON.stringify(results,null,2));
 }
}
