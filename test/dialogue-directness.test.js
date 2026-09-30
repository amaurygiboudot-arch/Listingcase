import test from "node:test";
import assert from "node:assert/strict";
import { deterministicReply } from "../lib/dialogue-guard.js";
import { fallbackReply } from "../lib/model.js";

const profile={
  name:"Chloé",
  type:"femme",
  personality:{},
  visualIdentity:{},
  hobbies:[],
  trust:100,
  stage:"attachement"
};
const mood={energy:70,mood:"calme"};

test("une question de préférence inconnue reçoit une réponse directe sans invention",()=>{
  const reply=deterministicReply(
    profile,mood,null,
    "Tu préfères travailler seule ou avec une équipe ?",
    []
  );
  assert.match(reply,/pas encore de préférence établie/i);
  assert.doesNotMatch(reply,/designer|je t’écoute/i);
});

test("le fallback ne récite plus le vieux slogan",()=>{
  const reply=fallbackReply(profile,mood,"question inconnue");
  assert.doesNotMatch(reply,/je t’écoute/i);
  assert.doesNotMatch(reply,/je garde ma propre opinion/i);
});
