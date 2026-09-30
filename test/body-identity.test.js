import test from "node:test";
import assert from "node:assert/strict";

import { createProfile,ensureBodyIdentity } from "../lib/profile.js";
import { deterministicReply,sanitizeModelReply } from "../lib/dialogue-guard.js";
import { buildCloudMessages } from "../lib/model.js";

const baseProfile=()=>({
  personId:"CHLOE_001",seed:"CHLOE_001_seed_main",name:"Chloé",type:"femme",
  origin:"non établie",personality:{directness:"douce",affection:"tendre"},
  values:["simplicité"],humor:"taquin",job:"studio de communication",sport:"non établi",
  hobbies:[],modesty:"non établie",attachment:"proche",stage:"attachement",
  trust:72,affinity:78,visualIdentity:{eyeColor:"clairs",hairColor:"blonds",hair:"souples",height:"non établie",build:"féminine naturelle"}
});
const mood={mood:"taquine",energy:70,affection:80};

test("le profil historique de Chloé récupère une anatomie féminine",()=>{
  const p=baseProfile();
  ensureBodyIdentity(p);
  assert.equal(p.bodyIdentity.anatomy,"féminine");
});

test("un nouveau profil féminin possède une identité corporelle",()=>{
  const p=createProfile(["femme"],[]);
  assert.equal(p.bodyIdentity.anatomy,"féminine");
});

test("une phrase sur les parties intimes ne déclenche plus le déni d'anatomie",()=>{
  const p=baseProfile();ensureBodyIdentity(p);
  const reply=deterministicReply(p,mood,{},"Tu as une foufoune et moi un zizi.");
  assert.match(reply,/parties intimes féminines/i);
  assert.doesNotMatch(reply,/n['’]ai pas/i);
});

test("une réponse modèle qui nie le corps défini est rejetée",()=>{
  const p=baseProfile();ensureBodyIdentity(p);
  const reply=sanitizeModelReply("Je suis une femme et je n’ai pas de parties génitales.",p,"Tu as une foufoune.");
  assert.equal(reply,null);
});

test("le prompt du modèle contient le fait corporel stable",()=>{
  const p=baseProfile();ensureBodyIdentity(p);
  const messages=buildCloudMessages({
    profile:p,mood,messages:[],memories:[],userText:"Tu as une foufoune ?",
    emotional:null,absence:null,partnerPreferences:[],userPreferences:[],lifestyle:null
  });
  assert.match(messages[0].content,/corps humain féminin/i);
  assert.match(messages[0].content,/parties intimes féminines/i);
});
