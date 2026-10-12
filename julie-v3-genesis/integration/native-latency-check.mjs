
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
const prompt='<|im_start|>system\nRéponds en français en une phrase courte.<|im_end|>\n<|im_start|>user\nBonjour Julie, comment vas-tu ?<|im_end|>\n<|im_start|>assistant\n';
const results=[];
for(let i=0;i<2;i++){
 const start=Date.now();let first=null,result;
 if(await page.evaluate(()=>typeof window.JulieLocal.start==='function')){
   const id=await page.evaluate(p=>window.JulieLocal.start(p),prompt);
   assert.ok(id);
   for(let k=0;k<1200;k++){
     result=await page.evaluate(id=>JSON.parse(window.JulieLocal.poll(id)),id);
     if(result.text&&first===null)first=Date.now()-start;
     if(result.done)break;
     await new Promise(r=>setTimeout(r,100));
   }
 }else{
   result=JSON.parse(await page.evaluate(p=>window.JulieLocal.generate(p),prompt));
   first=Date.now()-start;
 }
 assert.ok(result.text&&!result.error,JSON.stringify(result));
 results.push({run:i+1,firstVisibleMs:first,totalMs:Date.now()-start,text:result.text});
}
const label=process.argv.includes('--after')?'after':'before';
writeFileSync(base+'latency-'+label+'.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({label,results}));
process.exit(0);
