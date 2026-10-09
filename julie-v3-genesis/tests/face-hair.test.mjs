import test from 'node:test';
import assert from 'node:assert/strict';
import {julieBlinkAt,julieExpressionAt,findGenesisEyes,attachJulieFace} from '../www/julie-face.mjs';
import {attachJulieHair} from '../www/julie-hair.mjs';

test('Expressions de Julie : naturelles, finies et déterministes',()=>{
  const a=Array.from({length:500},(_,i)=>julieExpressionAt(i*.05));
  assert.ok(a.every(x=>Object.values(x).every(Number.isFinite)));
  assert.ok(a.every(x=>x.blink>=0&&x.blink<=1&&x.smile>=0&&x.smile<=1));
  assert.ok(a.some(x=>x.blink>.80),'Un vrai clignement doit se produire');
  assert.ok(a.some(x=>x.blink===0),'Les yeux doivent rester ouverts entre deux clignements');
  assert.deepEqual(julieExpressionAt(2.5),julieExpressionAt(2.5));
});

test('Les changements faciaux sont localisés sur un GLB féminin vérifié',()=>{
  assert.throws(()=>attachJulieFace({traverse(fn){fn({isMesh:false})}}),/Corps féminin/);
  assert.throws(()=>findGenesisEyes({attributes:{position:{count:0}},index:{count:0}}),/globes oculaires/);
});

test('Le système capillaire refuse un faux crâne sans squelette ni peau',()=>{
  assert.throws(()=>attachJulieHair({traverse(fn){fn({isMesh:true})}}),/Crâne féminin/);
});
