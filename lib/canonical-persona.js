import fs from "node:fs";
import path from "node:path";

const file=path.resolve("config","canonical-personas.json");
let cache={schema_version:1,personas:{}};

function load(){
  try{
    cache=JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{
    cache={schema_version:1,personas:{}};
  }
  return cache;
}
load();

export function getCanonicalPersona(profile){
  const personId=String(profile?.personId||"").trim();
  if(!personId)return null;
  return cache.personas?.[personId]||null;
}

export function canonicalPersonaPublic(profile){
  const p=getCanonicalPersona(profile);
  if(!p)return null;
  return{
    enabled:true,
    version:p.version||null,
    sourceProfile:p.source_profile||null,
    relationship:p.relationship||null,
    voice:p.voice||null,
    intimacy:p.intimacy||null,
    lifestyle:p.lifestyle||null,
    sharedDynamic:p.relationship?.shared_dynamic||null
  };
}

export function canonicalRelationshipMemory(profile){
  const p=getCanonicalPersona(profile);
  return p?.relationship_snapshot||null;
}

export function canonicalPersonaPrompt(profile){
  const p=getCanonicalPersona(profile);
  if(!p)return"";
  const r=p.relationship||{},v=p.voice||{},i=p.intimacy||{},l=p.lifestyle||{},b=p.behavior||{};
  const avoid=Array.isArray(b.avoid)?b.avoid.join("; "):"";
  return [
    "PROFIL CANONIQUE PRIORITAIRE — ne jamais le régénérer ni l'écraser.",
    `Relation avec ${r.user_name||"l'utilisateur"}: ${r.status||"établie"}. Premier contact: NON.`,
    `Dynamique: ${r.shared_dynamic||"familière et naturelle"}.`,
    `Voix: ${v.language||"français"}, ${v.address||"tutoiement"}, messages ${v.length||"plutôt courts"}, ton ${(v.tone||[]).join(", ")}.`,
    `Humeur: ${v.show_mood||"visible avec mesure"}. Emojis: ${v.emojis||"modérés"}.`,
    v.response_shape?`Forme des réponses: ${v.response_shape}.`:"",
    v.naturalness?`Naturel: ${v.naturalness}.`:"",
    v.pet_names?`Surnoms: ${v.pet_names}.`:"",
    v.signature?`Signature de dialogue: ${v.signature}.`:"",
    Array.isArray(v.avoid_openers)&&v.avoid_openers.length?`N’ouvre pas tes réponses par: ${v.avoid_openers.join(" / ")}.`:"",
    i.adult?`Intimité adulte: relation ${i.relationship_level||"établie"}; ton intime ${(i.tone||[]).join(", ")}; activation ${i.activation||"contextuelle"}.`:"",
    i.language?`Langage intime: ${i.language}.`:"",
    i.semantics?`Sens du vocabulaire intime: ${i.semantics}.`:"",
    i.boundaries?`Dans l’intimité: ${i.boundaries}.`:"",
    l.alcohol?`Alcool: ${l.alcohol}.`:"",
    b.own_opinions?"Garde tes opinions propres; tu peux être en désaccord, hésiter et reconnaître une erreur.":"",
    `Initiatives: ${b.initiative||"contextuelles"}.`,
    `Tâches techniques: ${b.technical_tasks||"précises et efficaces"}.`,
    `Informations inconnues: ${b.unknown_facts||"ne pas inventer"}.`,
    p.relationship_snapshot?`Continuité actuelle: ${p.relationship_snapshot}`:"",
    avoid?`À éviter: ${avoid}.`:"",
    p.visual_rule?`Visuel: ${p.visual_rule}`:""
  ].filter(Boolean).join("\n");
}
