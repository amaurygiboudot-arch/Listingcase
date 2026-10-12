import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join,extname,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createInitialState,appendConversation} from '../www/state-store.mjs';
const root=fileURLToPath(new URL('../www/',import.meta.url));
const assets=String.raw`C:\Dev\JULIE\learning-build-20261011\android\app\src\main\assets\julie`;
const server=createServer((req,res)=>{
 const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';
 const p=resolve(root,relative);if(!p.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
 const file=existsSync(p)?p:join(assets,relative);
 try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}
 catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const folder=mkdtempSync(join(tmpdir(),'julie-dna-test-'));
const executablePath=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync);
const key='julie-preview:JULIE_001:v1',results=[];let browser;
let old=appendConversation(createInitialState(100),'je préfère les tests fiables','Bien noté',200);delete old.dna;
const guard=ctx=>ctx.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
try{
 browser=await chromium.launch({headless:true,executablePath});let ctx=await browser.newContext({viewport:{width:390,height:844}});await guard(ctx);
 await ctx.addInitScript(({key,old})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(old));},{key,old});
 let page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('dialog',d=>d.accept());
 await page.goto(url);await page.locator('[data-view="memory"]').click();await page.locator('#dna-panel').waitFor();
 assert.match(await page.locator('#dna-panel').textContent(),/JULIE_001/);
 await page.locator('#dna-field').selectOption('trait:curiosite');await page.locator('#dna-value').selectOption('1');
 await page.locator('#dna-reason').fill('Test isolé : curiosité plus marquée');await page.locator('#dna-save').click();
 await page.waitForFunction(()=>document.querySelector('#dna-status').textContent.includes('enregistrée'));
 let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(saved.dna.events.length,1);assert.deepEqual(saved.messages,old.messages);assert.deepEqual(saved.memories,old.memories);
 results.push('Migration et évolution UI : anciens messages et souvenirs inchangés');
 await page.screenshot({path:join(folder,'dna-ui.png'),fullPage:true});
 await ctx.storageState({path:join(folder,'storage.json')});await browser.close();
 browser=await chromium.launch({headless:true,executablePath});ctx=await browser.newContext({storageState:join(folder,'storage.json'),viewport:{width:390,height:844}});await guard(ctx);
 page=await ctx.newPage();page.on('dialog',d=>d.accept());await page.goto(url);await page.locator('[data-view="memory"]').click();
 assert.match(await page.locator('#dna-panel').textContent(),/1 évolution/);
 assert.match(await page.locator('#dna-panel').textContent(),/curiosité plus marquée/i);results.push('Nouveau processus navigateur : ADN et raison retrouvés');
 await page.locator('[data-view="chat"]').click();await page.locator('#chat-input').fill('ton ADN');await page.locator('#chat-form button').click();
 await page.waitForFunction(()=>document.querySelector('#conversation').textContent.includes('Curiosité : plus marquée'));
 results.push('Conversation : commande ton ADN reflète la valeur persistée');
 await page.locator('[data-view="memory"]').click();const before=await page.evaluate(key=>localStorage.getItem(key),key);
 await page.evaluate(()=>{window.JulieAndroid={writeState:()=>false};});
 await page.locator('#dna-value').selectOption('-1');await page.locator('#dna-reason').fill('Échec simulé');await page.locator('#dna-save').click();
 await page.waitForFunction(()=>document.querySelector('#dna-status').textContent.includes('non confirmée'));
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);results.push('Échec de stockage : aucun événement ni succès fictif');
 await page.evaluate(()=>delete window.JulieAndroid);
 assert.equal(await page.locator('#dna-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 writeFileSync(new URL('../../dna-browser-results.json',import.meta.url),JSON.stringify({passed:results.length,results,backend:'navigateur isolé, pas Android'},null,2));
 console.log(JSON.stringify({passed:results.length,results}));
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(folder,{recursive:true,force:true});}
