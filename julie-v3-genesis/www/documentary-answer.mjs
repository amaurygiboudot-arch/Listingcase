import {verifiedRules} from './documentary-memory.mjs';
export async function documentaryAnswer(memory,text){
  const t=text.toLocaleLowerCase('fr');
  let explanation='';
  if(/isotopes?/.test(t))explanation='Des isotopes ont le même nombre de protons Z, mais des nombres de neutrons différents.';
  else if(/isobares?/.test(t))explanation='Des isobares ont le même nombre de masse A, mais des nombres de protons Z différents.';
  else if(/nombre de masse|nucléons/.test(t))explanation='Le nombre de masse est A = Z + N : protons plus neutrons. Ce nombre ne donne pas la masse atomique exacte.';
  else if(/charge.*(ion|atome|électron)|(?:ion|atome).*charge/.test(t))explanation='Pour un atome ou un ion monoatomique, q = Z − e, en unités de charge élémentaire.';
  if(!explanation)return null;
  const rules=await verifiedRules(memory);
  return rules?'D’après ma fiche documentaire SCI-003 : '+explanation+' Source : '+rules.source:'Je ne dispose pas actuellement d’une fiche validée utilisable pour répondre à cette question.';
}
