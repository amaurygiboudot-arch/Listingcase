import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../www/model-settings.mjs',import.meta.url));
const server=createServer((req,res)=>{
 if(req.url==='/model.mjs'){res.setHeader('Content-Type','application/javascript');res.end(source);return;}
 res.setHeader('Content-Type','text/html');res.end('<section id="settings-view"></section><section id="chat-view"><div class="pagehead"><p></p></div></section><script type="module">import {mountModelSettings} from "/model.mjs";mountModelSettings();</script>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{
  window.s={active:'1.5B',ready3b:false,importing:false,bytes:0,total:2104932768,ramBytes:8e9,message:''};window.calls=[];
  window.JulieLocal={modelStatus:()=>JSON.stringify(window.s),selectModel:n=>{window.calls.push(n);window.s.active=n;return true;}};
  window.JulieAndroid={downloadModel3b:()=>window.calls.push('download'),importModel3b:()=>{window.calls.push('import');window.s.importing=true;}};
 });
 await page.goto('http://127.0.0.1:'+server.address().port);
 assert.equal(await page.locator('#model-use-3b').isDisabled(),true);
 await page.locator('#model-download').click();await page.locator('#model-import').click();
 assert.equal(await page.locator('#model-use-small').isDisabled(),true);
 await page.evaluate(()=>{window.s.importing=false;window.s.ready3b=true;});
 await page.waitForFunction(()=>!document.querySelector('#model-use-3b').disabled);
 await page.locator('#model-use-3b').click();assert.match(await page.locator('#chat-view p').textContent(),/3B/);
 await page.locator('#model-use-small').click();assert.match(await page.locator('#chat-view p').textContent(),/1.5B/);
 assert.deepEqual(await page.evaluate(()=>window.calls),['download','import','3B','1.5B']);
 const report={passed:true,backend:'Isolated Edge with simulated Android bridge',checks:['3B unavailable until verified','download and import explicit','controls locked during import','active label changes','return to 1.5B']};
 writeFileSync(new URL('../../model-settings-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server.close();}
