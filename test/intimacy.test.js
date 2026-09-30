import test from "node:test";
import assert from "node:assert/strict";

import { detectIntimateIntent,intimateTurnPrompt,isIntimateSemanticMisread,intimateFallback } from "../lib/intimacy.js";
import { deterministicReply,sanitizeModelReply } from "../lib/dialogue-guard.js";
import { canonicalPersonaPrompt } from "../lib/canonical-persona.js";

const chloe={
  personId:"CHLOE_001",
  name:"Chloé",
  type:"femme",
  stage:"attachement",
  trust:100,
  bodyIdentity:{anatomy:"féminine"},
  visualIdentity:{},
  personality:{},
  hobbies:[],
  values:[],
  humor:"taquin",
  job:"studio de communication",
  sport:"non établi"
};
const mood={energy:70,mood:"taquine"};

test("parle-moi de ton sexe est une intention intime anatomique",()=>{
  const intent=detectIntimateIntent("Parle-moi de ton sexe");
  assert.equal(intent.active,true);
  assert.equal(intent.anatomy,true);
  assert.match(intimateTurnPrompt(chloe,"Parle-moi de ton sexe"),/anatomie sexuelle/i);
});

test("une interprétation zoologique du mot sexe est rejetée",()=>{
  assert.equal(isIntimateSemanticMisread("Le sexe n'est pas un animal ni une espèce.","Parle-moi de ton sexe"),true);
  assert.equal(sanitizeModelReply("Le sexe n'est pas un animal.",chloe,"Parle-moi de ton sexe"),null);
});

test("une question oui/non sur son sexe reçoit une réponse anatomique directe",()=>{
  const reply=deterministicReply(chloe,mood,null,"Est-ce que tu as un sexe ?");
  assert.match(reply,/intimité de femme/i);
  assert.doesNotMatch(reply,/animal|espèce/i);
});

test("une demande descriptive intime reste libre pour le moteur de dialogue",()=>{
  assert.equal(deterministicReply(chloe,mood,null,"Décris-moi ton sexe"),null);
  assert.equal(deterministicReply(chloe,mood,null,"Parle-moi de ta poitrine"),null);
  assert.equal(deterministicReply(chloe,mood,null,"J’ai envie qu’on parle de sexe avec toi"),null);
});

test("le fallback intime reste dans le bon sens du mot",()=>{
  const reply=intimateFallback(chloe,"Parle-moi de ton sexe");
  assert.match(reply,/intimité de femme/i);
  assert.doesNotMatch(reply,/animal|espèce/i);
});

test("le profil canonique conserve le style intime et réponse directe",()=>{
  const prompt=canonicalPersonaPrompt(chloe);
  assert.match(prompt,/Intimité adulte/i);
  assert.match(prompt,/répondre d’abord clairement/i);
  assert.match(prompt,/jamais clinique ni zoologique/i);
});
