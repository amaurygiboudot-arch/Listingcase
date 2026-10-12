
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const adb='C:/Users/amaur/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const pkg='com.julie.learning.experimental';
const base='C:/Dev/JULIE/learning-build-20261011/';
const command=(...args)=>execFileSync(adb,['-s','40b0f1cc',...args],{encoding:'utf8',timeout:30000}).trim();
async function connect(){
  const pid=command('shell','pidof',pkg);
  assert.match(pid,/^\d+$/);
  command('forward','tcp:9224','localabstract:webview_devtools_remote_'+pid);
  for(let i=0;i<20;i++){
    try{
      const targets=await (await fetch('http://127.0.0.1:9224/json',{signal:AbortSignal.timeout(5000)})).json();
      const target=targets.find(t=>t.url.includes('appassets.androidplatform.net'));
      if(target){

        const ws=new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
        let seq=0;const pending=new Map();
        ws.onmessage=event=>{const msg=JSON.parse(event.data);const cb=pending.get(msg.id);if(cb){pending.delete(msg.id);cb(msg);}};
        const send=(method,params)=>new Promise((resolve,reject)=>{
          const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},150000);
          pending.set(id,msg=>{clearTimeout(timer);msg.error?reject(Error(JSON.stringify(msg.error))):resolve(msg.result);});
          ws.send(JSON.stringify({id,method,params}));
        });
        const page={
          async evaluate(fn,arg){
            const r=await send('Runtime.evaluate',{expression:'('+fn.toString()+')('+JSON.stringify(arg)+')',returnByValue:true,awaitPromise:true});
            if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
            return r.result.value;
          },
          on(){},
          async waitForFunction(fn,arg){
            for(let k=0;k<150;k++){if(await this.evaluate(fn,arg))return;await new Promise(r=>setTimeout(r,1000));}
            throw Error('App state timeout');
          }
        };
        await page.waitForFunction(()=>!!document.querySelector('#chat-input'));
        return {page,ws};
      }
    }catch(e){if(i===19)throw e;}
    await new Promise(r=>setTimeout(r,500));
  }
  throw Error('WebView unavailable');
}
const {page}=await connect();
const state=await page.evaluate(()=>JSON.parse(window.JulieAndroid.readState()));
if(process.argv.includes('--inspect')){
  const expected=JSON.parse(readFileSync(base+'native-exam-state.json','utf8'));
  assert.deepEqual(state.messages,expected.messages);
  assert.deepEqual(state.memories,expected.memories);
  assert.deepEqual(state.learning.documentary.attempts,expected.learning.documentary.attempts);
  assert.equal(await page.evaluate(()=>window.JulieLocal.available()),true);
  const label=await page.evaluate(()=>document.body.textContent);
  assert.ok(label.includes('modèle local Qwen2.5'));
  assert.ok(!label.includes("Ce mode n'utilise pas encore"));
  await page.evaluate(()=>document.querySelector('[data-view=chat]').click());
  console.log('PASS final installed UI, native availability, 20 messages and 8 exams preserved');
  process.exit(0);
}
if(process.argv.includes('--snapshot')){
  writeFileSync(base+'native-before-state.json',JSON.stringify(state));
  console.log(JSON.stringify({stage:'baseline',messages:state.messages.length,attempts:state.learning.documentary.attempts.length}));
  process.exit(0);
}
const examMode=process.argv.includes('--exam');
const before=JSON.parse(readFileSync(base+(examMode?'native-after-state.json':'native-before-state.json'),'utf8'));
assert.deepEqual(state.messages,before.messages,'Existing messages changed during update');
assert.deepEqual(state.memories,before.memories,'Existing memories changed during update');
assert.deepEqual(state.learning.documentary.attempts,before.learning.documentary.attempts,'Existing exams changed during update');
assert.equal(await page.evaluate(()=>window.JulieLocal.available()),true,'Native model unavailable');
page.on('dialog',async d=>{console.log('APP_DIALOG: '+d.message());await d.dismiss();});
await page.evaluate(exam=>{
  document.querySelector('#chat-input').value=exam?'contrôle surprise':'Réponds en une phrase courte : bonjour Amaury.';
  document.querySelector('#chat-form').requestSubmit();
},examMode);
await page.waitForFunction(n=>JSON.parse(window.JulieAndroid.readState()).messages.length===n+2,before.messages.length,{timeout:150000});
const after=await page.evaluate(()=>JSON.parse(window.JulieAndroid.readState()));
assert.deepEqual(after.messages.slice(0,before.messages.length),before.messages);
assert.ok(after.messages.at(-1).text.length>0);
if(examMode){
  assert.equal(after.learning.documentary.attempts.length,before.learning.documentary.attempts.length+1);
  const attempt=after.learning.documentary.attempts.at(-1);
  assert.match(attempt.mode,/Qwen/);
  assert.ok(attempt.score>=0&&attempt.score<=20);
  console.log(JSON.stringify({stage:'native_exam',score:attempt.score,mode:attempt.mode,items:attempt.items}));
}
writeFileSync(base+(examMode?'native-exam-state.json':'native-after-state.json'),JSON.stringify(after));
console.log(JSON.stringify({stage:'native_chat',reply:after.messages.at(-1).text,messages:after.messages.length}));
command('shell','am','force-stop',pkg);
command('shell','am','start','-W','-n',pkg+'/com.humanpartner.MainActivity');
const second=await connect();
const restarted=await second.page.evaluate(()=>JSON.parse(window.JulieAndroid.readState()));
assert.deepEqual(restarted.messages,after.messages);
assert.deepEqual(restarted.memories,after.memories);
assert.deepEqual(restarted.learning.documentary.attempts,after.learning.documentary.attempts);
console.log('PASS: existing data preserved, native chat saved, state retained after process restart');
process.exit(0);
