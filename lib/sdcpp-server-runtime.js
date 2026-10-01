import { spawn } from "node:child_process";

const DEFAULT_URL=(process.env.SDCPP_SERVER_URL||"http://127.0.0.1:8191").replace(/\/$/,"");
let child=null;
let startPromise=null;
let configKey="";
let idleTimer=null;
let lastLog="";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function healthy(){
  try{
    const r=await fetch(DEFAULT_URL+"/v1/models",{signal:AbortSignal.timeout(1500)});
    return r.ok;
  }catch{return false}
}

async function waitReady(timeoutMs=Number(process.env.SDCPP_SERVER_STARTUP_TIMEOUT_MS||300000)){
  const until=Date.now()+timeoutMs;
  while(Date.now()<until){
    if(await healthy())return true;
    await sleep(1000);
  }
  return false;
}
export async function stopSdCppServer(reason="stop"){
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null}
  if(!child)return false;
  const c=child;child=null;configKey="";
  try{c.kill()}catch{}
  console.log("SDCPP server stopped:",reason);
  return true;
}

export async function ensureSdCppServer({bin,model,threads=4,backend="diffusion=Vulkan0,clip=CPU,vae=CPU"}){
  const key=[bin,model,threads,backend].join("|");
  if(await healthy()){
    configKey=configKey||key;
    return{ready:true,url:DEFAULT_URL,reused:true};
  }
  if(startPromise)return startPromise;
  if(child&&configKey!==key)await stopSdCppServer("config_change");

  startPromise=(async()=>{
    const u=new URL(DEFAULT_URL);
    const args=[
      "-m",model,
      "--listen-ip",u.hostname,
      "--listen-port",String(u.port||8191),
      "--backend",backend,
      "--threads",String(threads),
      "--mmap","--eager-load","--log-level","warn"
    ];
    child=spawn(bin,args,{windowsHide:true,stdio:["ignore","pipe","pipe"]});
    configKey=key;
    const onData=chunk=>{
      const s=String(chunk||"").trim();
      if(s)lastLog=s.slice(-800);
    };
    child.stdout?.on("data",onData);
    child.stderr?.on("data",onData);
    child.on("exit",code=>{
      child=null;configKey="";
      if(code!==0)console.warn("SDCPP server exited:",code,lastLog);
    });

    const ready=await waitReady();
    if(!ready){
      await stopSdCppServer("startup_timeout");
      throw new Error("sdcpp_server_start_timeout");
    }
    console.log("SDCPP server ready:",DEFAULT_URL);
    return{ready:true,url:DEFAULT_URL,reused:false};
  })();

  try{return await startPromise}
  finally{startPromise=null}
}

export function keepSdCppServerWarm(ms=5*60*1000){
  if(idleTimer)clearTimeout(idleTimer);
  idleTimer=setTimeout(()=>stopSdCppServer("idle_timeout"),ms);
  idleTimer.unref?.();
}

export function sdCppServerStatus(){
  return{running:Boolean(child),url:DEFAULT_URL,lastLog};
}
