from pathlib import Path
from zipfile import ZipFile
import hashlib, json
root=Path(r'C:\Dev\JULIE\learning-integration-20261011')
build=Path(r'C:\Dev\JULIE\learning-build-20261011')
apk=build/'android/app/build/outputs/apk/debug/app-debug.apk'
with ZipFile(apk) as z:
    for name in ['app.js','index.html']:
        assert z.read('assets/julie/'+name)==(root/'julie-v3-genesis/www'/name).read_bytes(),name
    assert len(z.read('classes.dex'))>0
    assert len(z.read('assets/julie/models/julie_genesis_human.glb'))>0
r={'apk':str(apk),'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'assets_match_tested_sources':True,'installed':False}
(root/'learning-apk-result.json').write_text(json.dumps(r,indent=2),encoding='utf-8')
print(json.dumps(r))
