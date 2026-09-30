import fs from "node:fs";
import path from "node:path";
import { spawn,spawnSync } from "node:child_process";

const exe=(process.env.CLOUDFLARED_BIN||"C:\\Dev\\human-partner-tools\\cloudflared.exe").trim();
const cwd=path.resolve(process.cwd());
const endpointFile=path.join(cwd,"remote-endpoint.json");
let child=null;
let restartTimer=null;
let currentUrl="";

function publishEndpoint(url){
  if(!url||url===currentUrl)return;
  currentUrl=url;
  const payload={url,updatedAt:new Date().toISOString()};
  fs.writeFileSync(endpointFile,JSON.stringify(payload,null,2)+"\n","utf8");

  try{
    spawnSync("git",["add","remote-endpoint.json"],{cwd,windowsHide:true});
    const diff=spawnSync("git",["diff","--cached","--quiet","--","remote-endpoint.json"],{cwd,windowsHide:true});
    if(diff.status!==0){
      spawnSync("git",["commit","-m","[skip ci] update remote endpoint"],{cwd,windowsHide:true,stdio:"ignore"});
      const push=spawn("git",["push","origin","main"],{cwd,windowsHide:true,stdio:["ignore","ignore","ignore"]});
      push.unref();
    }
  }catch(e){
    console.error("REMOTE TUNNEL publish:",e.message);
  }
}

function parseOutput(chunk){
  const text=String(chunk||"");
  const m=text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if(m){
    console.log("Remote tunnel:",m[0]);
    publishEndpoint(m[0]);
  }
}

function launch(port){
  if(!fs.existsSync(exe)){
    console.error("REMOTE TUNNEL: cloudflared missing:",exe);
    return;
  }
  child=spawn(exe,["tunnel","--url",`http://127.0.0.1:${port}`,"--no-autoupdate"],{
    cwd,
    windowsHide:true,
    stdio:["ignore","pipe","pipe"]
  });
  child.stdout.on("data",parseOutput);
  child.stderr.on("data",parseOutput);
  child.on("exit",(code)=>{
    child=null;
    if(restartTimer)clearTimeout(restartTimer);
    restartTimer=setTimeout(()=>launch(port),5000);
    restartTimer.unref?.();
    console.error("REMOTE TUNNEL exited:",code);
  });
}

export function startRemoteTunnel(port=8787){
  if(String(process.env.DISABLE_REMOTE_TUNNEL||"0")==="1")return{started:false,reason:"disabled"};
  if(child)return{started:true,pid:child.pid};
  launch(port);
  return{started:Boolean(child),pid:child?.pid||0};
}

export function stopRemoteTunnel(){
  if(restartTimer){clearTimeout(restartTimer);restartTimer=null}
  if(child){
    try{child.kill()}catch{}
    child=null;
  }
}
