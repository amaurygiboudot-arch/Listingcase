// Rappel contextuel non persistant : uniquement une affirmation explicite
// de l'utilisateur dans les trente dernières minutes, jamais une supposition IA.
const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().trim();
export function recentPlanReply(messages,question,now=Date.now()){
 if(!Array.isArray(messages)||!Number.isSafeInteger(now))return null;
 const q=norm(question);
 if(!/(?:tu peux me (?:redire|rappeler)|rappelle.moi|qu.est.ce que je (?:fais|vais faire|t.ai dit))/i.test(q))return null;
 const users=messages.filter(m=>m?.role==='user'&&typeof m.text==='string'&&Number.isSafeInteger(m.at)&&m.at<=now&&now-m.at<=30*60000);
 for(const m of users.reverse()){
  const s=norm(m.text);
  const matched=/^je (?:pars|vais partir|dois partir) travailler dans (une heure|[0-9]+ (?:heures?|minutes?))\b/.exec(s);
  if(matched)return 'Tu m’as dit que tu partais travailler dans '+matched[1]+'. Je ne sais pas si ton programme a changé depuis.';
 }
 return null;
}
