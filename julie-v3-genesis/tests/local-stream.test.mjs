import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLocal} from '../www/local-conversation.mjs';
test('Async bridge waits for final output and does not return a partial answer',async()=>{
 let calls=0;
 const bridge={available:()=>true,start:()=> 'id',poll:id=>{
   assert.equal(id,'id');calls++;
   return JSON.stringify(calls===1?{text:'Bon',done:false}:{text:'Bonjour',done:true});
 }};
 assert.equal(await generateLocal('test',bridge),'Bonjour');
 assert.equal(calls,2);
});
test('Busy worker and failed generations remain explicit errors',async()=>{
 await assert.rejects(generateLocal('test',{available:()=>true,start:()=>''}),/occupé/);
 await assert.rejects(generateLocal('test',{available:()=>true,start:()=> 'id',poll:()=>JSON.stringify({done:true,error:'annulé'})}),/annulé/);
});
