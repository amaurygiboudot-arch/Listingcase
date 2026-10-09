import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JULIE_ID,createInitialState} from '../www/state-store.mjs';
import {clampFps} from '../www/avatar-utils.mjs';

const spec=JSON.parse(readFileSync(new URL('../spec/identity-contract.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../www/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../www/app.mjs',import.meta.url),'utf8');
const android=readFileSync(new URL('../android/MainActivity.java',import.meta.url),'utf8');

test('Document maître: identité, apparence et fondements approuvés',()=>{
  assert.equal(spec.schema,'julie.master.identity.v1');
  assert.equal(spec.immutable_id,'JULIE_001');
  assert.equal(spec.first_name,'Julie');
  assert.equal(spec.adult,true);
  assert.equal(spec.initial_age_years,22);
  assert.equal(spec.initial_appearance.height_m,1.75);
  assert.equal(spec.initial_appearance.build,'fine');
  assert.equal(spec.initial_appearance.hair_color,'blond');
  assert.equal(spec.initial_appearance.hair_length,'mi-long');
  assert.equal(spec.initial_appearance.eye_color,'vert');
  assert.equal(spec.initial_relationship,'couple virtuel établi');
  assert.equal(spec.one_real_day_equals_virtual_days,1);
});

test('JULIE_001 reste identique dans le moteur de mémoire et la page',()=>{
  assert.equal(JULIE_ID,spec.immutable_id);
  assert.equal(createInitialState(0).id,spec.immutable_id);
  assert.match(app,/heightMeters:1\.75/);
  assert.match(html,/Julie · 22 ans/);
  assert.match(android,/JulieSecureStore/);
});

test('Le projet utilise un vrai modèle Genesis et non un avatar Roblox',()=>{
  assert.match(app,/GLTFLoader/);
  assert.match(app,/stripGenesisConstructionHelpers\(root\)/);
  assert.match(app,/cleanGenesisFemaleAnatomy\(root\)/);
  assert.match(app,/attachJulieWardrobe\(THREE,root/);
  assert.match(app,/AnimationMixer\(root\)/);
});

test('Continuité, sécurité et limite 120 FPS : règles source non négociables',()=>{
  assert.equal(spec.safety.claim_human_consciousness,false);
  assert.equal(spec.safety.real_spending_requires_explicit_consent,true);
  assert.equal(spec.safety.erased_data_must_not_reappear,true);
  assert.equal(spec.limits.max_fps,120);
  for(const quality of ['eco','balanced','high']){
    assert.ok(clampFps(quality)<=spec.limits.max_fps);
  }
});

test('Un test de code ne remplace jamais la validation visuelle et humaine',()=>{
  const audit=readFileSync(new URL('../../docs/JULIE_CONFORMITE_DOCUMENT_MAITRE.md',import.meta.url),'utf8');
  assert.match(audit,/validation humaine indispensable/i);
  assert.match(audit,/coche verte GitHub/i);
  assert.match(audit,/Absents?|Prototype|Partiel/);
});
