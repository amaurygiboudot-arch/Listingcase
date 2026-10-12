from pathlib import Path
import hashlib,base64,json,gzip
old=Path(r'C:\Dev\JULIE\packages\JULIE-TEST-0.3.9-dialogue.apk').read_bytes()
new=Path(r'C:\Dev\JULIE\learning-build-20261011\android\app\build\outputs\apk\debug\app-debug.apk').read_bytes()
assert hashlib.sha256(old).hexdigest()=='3ff7d1da65973dda7bb2ccdf0ac78be8197046acfa028390c86c7f06de8a34bf'
Path(r'C:\Dev\JULIE\packages\JULIE-TEST-0.3.10-moteur.apk').write_bytes(new)
block=4096
known={old[i:i+block]:i for i in range(0,len(old),block)}
ops=[];pending=bytearray()
def flush():
 if pending: ops.append(['data',base64.b64encode(pending).decode()]);pending.clear()
for i in range(0,len(new),block):
 b=new[i:i+block];at=known.get(b)
 if at is None: pending.extend(b);continue
 flush()
 if ops and ops[-1][0]=='copy' and ops[-1][1]+ops[-1][2]==at: ops[-1][2]+=len(b)
 else: ops.append(['copy',at,len(b)])
flush()
obj={'old':hashlib.sha256(old).hexdigest(),'new':hashlib.sha256(new).hexdigest(),'size':len(new),'ops':ops}
raw=gzip.compress(json.dumps(obj,separators=(',',':')).encode())
Path(r'C:\Dev\JULIE\packages\moteur-0310-delta.gz').write_bytes(raw)
print(json.dumps({'apk_size':len(new),'apk_sha256':obj['new'],'delta_size':len(raw),'delta_sha256':hashlib.sha256(raw).hexdigest()}))
