import subprocess,shlex,time,json,re
from pathlib import Path
adb=r'C:\Users\amaur\AppData\Local\Android\Sdk\platform-tools\adb.exe'
args=[adb,'-s','40b0f1cc']
root='/data/local/tmp/julie-engine-test'
fast='/data/local/tmp/julie-engine-fast'
subprocess.run(args+['shell','mkdir','-p',fast],check=True)
subprocess.run(args+['push',r'C:\Dev\JULIE\native-engine-tools\build-android-arm64\bin\libggml-cpu.so',fast+'/libggml-cpu.so'],check=True)
prompt='<|im_start|>system\nTu es Julie, une femme virtuelle adulte. Parle de toi au feminin : contente, prete, heureuse. Reponds en francais en une phrase.\n<|im_end|>\n<|im_start|>user\nTu es content et pret a me parler ?<|im_end|>\n<|im_start|>assistant\n'
results=[]
for label,lib in [('portable',root),('dotprod',fast+':'+root)]:
    cmd='LD_LIBRARY_PATH='+shlex.quote(lib)+' '+root+'/llama-simple -m '+root+'/qwen2.5-1.5b.gguf -ngl 0 -n 96 '+shlex.quote(prompt)
    start=time.monotonic()
    run=subprocess.run(args+['shell',cmd],capture_output=True,timeout=120)
    out=run.stdout.decode('utf-8',errors='replace');err=run.stderr.decode('utf-8',errors='replace')
    assert run.returncode==0,(label,run.returncode,err[-2000:])
    metrics=[line for line in (out+'\n'+err).splitlines() if any(t in line for t in ['prompt eval time','eval time =','decoded '])]
    response=out.split('<|im_start|>assistant')[-1].strip()
    results.append(dict(label=label,seconds=round(time.monotonic()-start,3),response=response,metrics=metrics))
Path(r'C:\Dev\JULIE\learning-build-20261011\cpu-comparison.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
