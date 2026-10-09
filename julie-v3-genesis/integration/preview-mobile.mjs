import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../www');
const OUT=resolve(dirname(fileURLToPath(import.meta.url)),'julie-preview-mobile.png');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try {
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
    const request=new URL(req.url||'/','http://127.0.0.1/');
    let rel=decodeURIComponent(request.pathname);
    if(rel==='/'||rel==='')rel='/index.html';
    const pathname=resolve(ROOT,'.'+rel);
    if(pathname!==ROOT&&!pathname.startsWith(ROOT+sep)){res.writeHead(403).end();return;}
    const data=await readFile(pathname);
    res.writeHead(200,{'Content-Type':MIME[extname(pathname)]||'application/octet-stream',
      'Content-Length':data.length,'Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch(e){res.writeHead(404).end();}
});
await new Promise((ok,fail)=>server.once('error',fail).listen(0,'127.0.0.1',ok));
const address=server.address();
let browser;
try{
  const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/opt/google/chrome/chrome'];
  let executable=null;
  for(const path of candidates){
    try{await access(path);executable=path;break;}catch(e){}
  }
  assert.ok(executable,'Chromium/Google Chrome est requis pour valider la 3D');
  browser=await chromium.launch({
    executablePath:executable,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader',
      '--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl']
  });
  const context=await browser.newContext({
    viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,
    hasTouch:true,colorScheme:'dark',locale:'fr-FR',reducedMotion:'no-preference'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push('PAGE '+String(err)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE '+msg.text());});
  await page.route('**/*',route=>{
    const target=new URL(route.request().url());
    if(target.hostname==='127.0.0.1')route.continue();
    else route.abort();
  });
  await page.goto('http://127.0.0.1:'+address.port+'/index.html',
    {waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>{
    const text=document.getElementById('avatar-status')?.textContent||'';
    return text.includes('Corps Genesis nettoyé')||
      text.includes('Impossible de charger')||
      Boolean(document.getElementById('webgl-fallback')?.hidden===false);
  },{timeout:25000});
  const model=await page.evaluate(()=>{
    const status=document.getElementById('avatar-status');
    const fallback=document.getElementById('webgl-fallback');
    const canvas=document.getElementById('julie-3d');
    const gl=canvas?.getContext('webgl2')||canvas?.getContext('webgl');
    const summary={status:status?.textContent||'',fallbackVisible:!fallback?.hidden,
      width:canvas?.width||0,height:canvas?.height||0,webgl:!!gl,
      glError:gl?.getError()??null,quality:document.querySelector('#quality')?.value??null};
    if(status)status.hidden=true; // Ne pas masquer les détails sur la capture QA.
    return summary;
  });
  await page.waitForTimeout(1100);
  const png=await page.screenshot({path:OUT,fullPage:true,animations:'disabled'});
  assert.equal(model.fallbackVisible,false,'Modèle 3D indisponible dans Chrome');
  assert.ok(model.status.includes('Corps Genesis nettoyé'),'Le GLB Genesis ne s’est pas chargé');
  assert.ok(model.webgl&&model.width>100&&model.height>100,'Contexte graphique non initialisé');
  assert.equal(model.glError,0,'Le contexte WebGL signale une erreur');
  assert.ok(png.length>20000,'Capture vide / écran noir');
  const shaderErrors=errors.filter(e=>/shader error|webglprogram|gl_invalid_operation|THREE\.WebGLShader/i.test(e));
  if(shaderErrors.length)throw Error('Shader 3D incorrect: '+shaderErrors.slice(0,3).join(' | '));
  if(errors.length>0)console.log('NOTE CHROME WARNINGS',errors.slice(0,4).join(' | '));
  console.log('PASS JULIE CHROME WEBGL',JSON.stringify({...model,
    screenshotBytes:png.length,image:'julie-preview-mobile.png'}));
  await context.close();
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
