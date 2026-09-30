import test from "node:test";
import assert from "node:assert/strict";
import { detectIntimateIntent,isIntimateSemanticMisread } from "../lib/intimacy.js";
import { sanitizeModelReply } from "../lib/dialogue-guard.js";

const profile={type:"femme",bodyIdentity:{anatomy:"féminine"},hobbies:[]};

test("parle-moi de ton sexe est reconnu comme contexte intime adulte",()=>{
  const x=detectIntimateIntent("Parle-moi de ton sexe");
  assert.equal(x.active,true);
  assert.equal(x.anatomy,true);
});

test("un contresens zoologique est rejeté dans un contexte intime",()=>{
  assert.equal(isIntimateSemanticMisread("Ce n'est pas un animal.","Parle-moi de ton sexe"),true);
  assert.equal(sanitizeModelReply("Ce n'est pas un animal.",profile,"Parle-moi de ton sexe"),null);
});

test("les ouvertures génériques d'assistant sont rejetées",()=>{
  assert.equal(sanitizeModelReply("Je comprends ta question. Voilà mon avis.",profile,"Dis-moi ce que tu en penses"),null);
  assert.equal(sanitizeModelReply("Je t’écoute. Vas-y.",profile,"Tu en penses quoi ?"),null);
});
