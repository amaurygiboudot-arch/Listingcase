import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrompt} from '../www/local-conversation.mjs';
test('Exam context excludes relationship and retains scientific reference',()=>{
 const p=buildPrompt([],'Z=2 N=3. Un entier.',true,true);
 assert.ok(!p.includes('Amaury')); assert.ok(!p.includes('affectueuse'));
 assert.ok(p.includes('SCI-003')); assert.ok(p.includes('Un entier.'));
});
