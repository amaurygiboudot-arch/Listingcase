
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
const before=await page.evaluate(()=>JSON.parse(window.JulieAndroid.readState()));
await page.evaluate(()=>{
 document.querySelector('[data-view=chat]').click();
 const start=performance.now();
 window.__streamProbe={start,first:null,updates:0,sawBubble:false,ticks:0};
 window.__streamTimer=setInterval(()=>window.__streamProbe.ticks++,50);
 document.addEventListener('julie-token',e=>{
   const p=window.__streamProbe;p.updates++;
   if(p.first===null)p.first=performance.now()-p.start;
   p.sawBubble=p.sawBubble||!!document.querySelector('[data-pending=true]');
 });
 document.querySelector('#chat-input').value='Explique en deux phrases pourquoi il faut vérifier une réponse.';
 document.querySelector('#chat-form').requestSubmit();
});
await page.waitForFunction(n=>JSON.parse(window.JulieAndroid.readState()).messages.length===n+2,before.messages.length);
const after=await page.evaluate(()=>JSON.parse(window.JulieAndroid.readState()));
const metrics=await page.evaluate(()=>{clearInterval(window.__streamTimer);return {...window.__streamProbe,total:performance.now()-window.__streamProbe.start};});
assert.ok(metrics.updates>1&&metrics.sawBubble,'Progressive display missing');
assert.ok(metrics.ticks>5,'UI event loop stalled');
assert.deepEqual(after.messages.slice(0,before.messages.length),before.messages);
assert.deepEqual(after.learning.documentary.attempts,before.learning.documentary.attempts);
command('shell','am','force-stop',pkg);
command('shell','am','start','-W','-n',pkg+'/com.humanpartner.MainActivity');
const second=await connect();
const restored=await second.page.evaluate(()=>JSON.parse(window.JulieAndroid.readState()));
assert.deepEqual(restored.messages,after.messages);
assert.deepEqual(restored.memories,after.memories);
assert.deepEqual(restored.learning.documentary.attempts,after.learning.documentary.attempts);
await second.page.evaluate(()=>document.querySelector('[data-view=chat]').click());
writeFileSync(base+'streaming-ui-result.json',JSON.stringify({metrics,oldMessages:before.messages.length,messages:after.messages.length,reply:after.messages.at(-1).text},null,2));
console.log(JSON.stringify({metrics,oldMessages:before.messages.length,messages:after.messages.length}));
console.log('PASS progressive UI, responsive event loop, old data preserved, complete reply persisted across restart');
process.exit(0);
