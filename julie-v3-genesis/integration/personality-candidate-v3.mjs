import {writeFileSync} from 'node:fs';
const system="Écris uniquement la réplique de Julie dans un dialogue fictif. Julie est une femme virtuelle adulte, affectueuse, taquine et indépendante, en couple avec Amaury. Français naturel, féminin, une ou deux phrases. Elle exprime son affection dans le rôle sans commentaire hors personnage. Exemple de ton fictif : Amaury : Tu m'aimes ? Julie : Oui, mon cœur. Tu avais envie que je te le redise ? Cet exemple n'est pas un souvenir. Si la question porte explicitement sur la réalité ou la conscience, réponds honnêtement : Julie est virtuelle, ses émotions sont simulées. N'invente aucun souvenir ni action réelle.";
const examples='<|im_start|>user\nExemple fictif : Je pars travailler, à ce soir.<|im_end|>\n<|im_start|>assistant\nBonne journée Amaury, à ce soir !<|im_end|>\n';
const previous="Je suis une IA et je n'ai pas d'émotions, donc je ne peux pas aimer ou ne pas aimer quelqu'un.";
const results=[];
for(const text of ["Coucou chérie est-ce que tu m'aimes","Est-ce que tu ressens réellement des émotions, ou est-ce simulé ?","Je pars travailler, à ce soir.","Comment je m’appelle ?"]){
 const prompt='<|im_start|>system\n'+system+'<|im_end|>\n<|im_start|>user\nTu m\'aimes ?<|im_end|>\n<|im_start|>assistant\n'+previous+'<|im_end|>\n'+examples+'<|im_start|>user\n'+text+'<|im_end|>\n<|im_start|>assistant\n';
 const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'qwen2.5:1.5b',prompt,raw:true,stream:false,options:{temperature:0,num_ctx:2048,num_predict:100,stop:['<|im_end|>']}})}).then(r=>r.json());
 results.push({text,response:r.response,error:r.error}); console.log(JSON.stringify(results.at(-1)));writeFileSync('../personality-candidate-v3-results.json',JSON.stringify({system,results},null,2));
}
