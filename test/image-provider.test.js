import test from "node:test";
import assert from "node:assert/strict";

const {expectedSdCppModelSize,validSdCppModelSize,validIdentityAdapterSizes}=await import("../lib/image-provider.js");

test("le modèle DreamShaper intégré exige sa taille complète",()=>{
  const file="C:/models/dreamshaper-7-lcm-q4_0.gguf";
  assert.equal(expectedSdCppModelSize(file),1625041920);
  assert.equal(validSdCppModelSize(file,1548014548),false);
  assert.equal(validSdCppModelSize(file,1625041920),true);
});

test("un modèle personnalisé conserve le seuil générique",()=>{
  assert.equal(expectedSdCppModelSize("custom.gguf"),null);
  assert.equal(validSdCppModelSize("custom.gguf",1500000001),true);
});

test("l’IP-Adapter visage exige ses deux poids complets",()=>{
  assert.equal(validIdentityAdapterSizes(1260000001,98100000),true);
  assert.equal(validIdentityAdapterSizes(600000000,98100000),false);
  assert.equal(validIdentityAdapterSizes(1260000001,44000000),false);
});