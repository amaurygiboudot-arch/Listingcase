// Test isolé : nouveau profil Edge, serveur localhost, aucun site externe autorisé.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../www/',import.meta.url));
const oldAssets='C:\\Dev\\JULIE\\JULIE-build-test-20261011-195325\\android\\app\\src\\main\\assets\\julie';
const server=createServer((req,res)=>{
  const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';
  const p=resolve(root,relative);
  if(!p.startsWith(resolve(root))) {res.writeHead(403);res.end();return;}
  const file=existsSync(p)?p:join(oldAssets,relative);
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}
  catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const folder=mkdtempSync(join(tmpdir(),'julie-exam-browser-'));
const executablePath=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync);
let browser;
const progress=step=>{console.log(step);writeFileSync(new URL('../../learning-browser-progress.txt',import.meta.url),step);};
const results=[];
try{
  browser=await chromium.launch({headless:true,executablePath});
  let ctx=await browser.newContext({viewport:{width:390,height:844}});
  const guard=ctx=>ctx.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await guard(ctx);let page=await ctx.newPage();page.setDefaultTimeout(20000);progress('browser started');
  await page.goto(url);progress('page loaded');await page.locator('[data-view="memory"]').click();progress('memory opened');
  await page.waitForFunction(()=>document.getElementById('exam-status').textContent.includes('examinée'));
  await page.locator('#exam-surprise').click();
  await page.waitForFunction(()=>document.getElementById('exam-results').textContent.includes('20/20'));
  assert.equal(await page.locator('#exam-results details').count(),1);results.push('bouton surprise : 20/20, quatre corrigés');
  await page.locator('#exam-results summary').click();assert.equal(await page.locator('#exam-results details p').count(),5);
  assert.match(await page.locator('#exam-revisions').textContent(),/J\+1.*J\+7.*J\+30/);
  await ctx.storageState({path:join(folder,'storage.json')});await browser.close();
  browser=await chromium.launch({headless:true,executablePath});
  ctx=await browser.newContext({storageState:join(folder,'storage.json'),viewport:{width:390,height:844}});await guard(ctx);
  page=await ctx.newPage();page.setDefaultTimeout(20000);await page.goto(url);await page.locator('[data-view="memory"]').click();
  assert.equal(await page.locator('#exam-results details').count(),1);results.push('nouveau navigateur : résultat retrouvé');
  await page.locator('[data-view="chat"]').click();await page.locator('#chat-input').fill('Que sont les isobares ?');await page.locator('#chat-form button').click();
  await page.waitForFunction(()=>document.getElementById('conversation').textContent.includes('SCI-003'));results.push('dialogue : réponse documentaire sourcée');
  await page.locator('[data-view="memory"]').click();page.on('dialog',d=>d.accept());
  await page.locator('#learning-erase').click();await page.reload();await page.locator('[data-view="memory"]').click();
  assert.equal(await page.locator('#exam-results details').count(),0);assert.equal(await page.locator('#exam-surprise').isDisabled(),true);
  results.push('effacement et rechargement : ni fiche ni résultat restauré');
  const report={passed:results.length,results};
  writeFileSync(new URL('../../learning-browser-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){progress('FAILED '+error.stack);throw error;}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(folder,{recursive:true,force:true});}
