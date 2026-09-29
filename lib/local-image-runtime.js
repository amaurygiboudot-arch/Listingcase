import fs from "node:fs";
import path from "node:path";
import { spawn,spawnSync } from "node:child_process";

const baseUrl=(process.env.COMFYUI_BASE_URL||"http://127.0.0.1:8188").replace(/\/$/,"");
const preferredRuntimeMode=(process.env.COMFYUI_RUNTIME_MODE||"cpu").trim().toLowerCase();
const portableRoot=(process.env.COMFYUI_PORTABLE_ROOT||"C:\\AI\\ComfyUI_windows_portable").trim();
const pythonExe=path.join(portableRoot,"python_embeded","python.exe");
const mainPy=path.join(portableRoot,"ComfyUI","main.py");
const logPath=path.resolve("data","comfyui-runtime.log");

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ownedPid=0;

export function localImageRuntimeInstalled(){
  return fs.existsSync(pythonExe)&&fs.existsSync(mainPy);
}

export async function localImageRuntimeReady(){
  try{
    const r=await fetch(`${baseUrl}/system_stats`,{signal:AbortSignal.timeout(1800)});
    return r.ok;
  }catch{return false}
}

async function waitReady(timeoutMs){
  const until=Date.now()+timeoutMs;
  while(Date.now()<until){
    if(await localImageRuntimeReady())return true;
    await sleep(1500);
  }
  return false;
}

function startProcess(mode){
  fs.mkdirSync(path.dirname(logPath),{recursive:true});
  const fd=fs.openSync(logPath,"a");
  const args=[
    "-s",mainPy,
    "--windows-standalone-build",
    "--listen","127.0.0.1",
    "--port","8188",
    "--preview-method","none",
    "--disable-auto-launch"
  ];
  if(mode==="cpu")args.push("--cpu");
  else args.push("--novram");
  const child=spawn(pythonExe,args,{
    cwd:path.join(portableRoot,"ComfyUI"),
    detached:false,
    windowsHide:true,
    stdio:["ignore",fd,fd]
  });
  fs.closeSync(fd);
  return child;
}

function killTree(pid){
  if(!pid)return;
  try{spawnSync("taskkill",["/PID",String(pid),"/T","/F"],{windowsHide:true,stdio:"ignore"})}catch{}
}

export async function ensureLocalImageRuntime(){
  if(await localImageRuntimeReady())return{ready:true,mode:"existing"};
  if(!localImageRuntimeInstalled())return{ready:false,error:"comfyui_not_installed"};

  if(preferredRuntimeMode==="cpu"){
    const child=startProcess("cpu");
    ownedPid=child.pid||0;
    if(await waitReady(300000))return{ready:true,mode:"cpu",pid:child.pid};
    killTree(child.pid);
    ownedPid=0;
    return{ready:false,error:"comfyui_start_failed",logPath};
  }

  let child=startProcess("gpu-low");
  ownedPid=child.pid||0;
  if(await waitReady(120000))return{ready:true,mode:"gpu-low",pid:child.pid};
  killTree(child.pid);

  child=startProcess("cpu");
  ownedPid=child.pid||0;
  if(await waitReady(300000))return{ready:true,mode:"cpu",pid:child.pid};
  killTree(child.pid);
  ownedPid=0;
  return{ready:false,error:"comfyui_start_failed",logPath};
}

export async function stopOwnedLocalImageRuntime(){
  if(!ownedPid)return false;
  const pid=ownedPid;
  ownedPid=0;
  killTree(pid);
  await sleep(1200);
  return true;
}
