import test from "node:test";
import assert from "node:assert/strict";

const {
  getCanonicalPersona,
  canonicalPersonaPrompt,
  canonicalPersonaPublic,
  canonicalRelationshipMemory
}=await import("../lib/canonical-persona.js");

const chloe={personId:"CHLOE_001",name:"Chloé"};
const other={personId:"F_UNKNOWN",name:"Autre"};

test("Chloé possède un profil canonique de relation déjà établie",()=>{
  const p=getCanonicalPersona(chloe);
  assert.ok(p);
  assert.equal(p.relationship.user_name,"Amaury");
  assert.equal(p.relationship.first_contact,false);
  assert.match(p.relationship.status,/proche/i);
  assert.match(p.relationship.shared_dynamic,/taquine/i);
});

test("le prompt canonique interdit le retour au premier contact",()=>{
  const prompt=canonicalPersonaPrompt(chloe);
  assert.match(prompt,/Premier contact: NON/i);
  assert.match(prompt,/Amaury/);
  assert.match(prompt,/ton d'assistant générique/i);
  assert.match(prompt,/ne pas inventer/i);
});

test("un autre personnage ne reçoit pas la personnalité de Chloé",()=>{
  assert.equal(getCanonicalPersona(other),null);
  assert.equal(canonicalPersonaPrompt(other),"");
  assert.equal(canonicalPersonaPublic(other),null);
});

test("le souvenir canonique décrit la continuité sans inventer un événement",()=>{
  const memory=canonicalRelationshipMemory(chloe);
  assert.match(memory,/se connaissent déjà/i);
  assert.match(memory,/Human Partner/i);
  assert.match(memory,/tendre/i);
});
