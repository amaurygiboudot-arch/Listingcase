from pathlib import Path
from zipfile import ZipFile
from hashlib import sha256
old=Path(r'C:\Dev\JULIE\packages\JULIE-TEST-0.3.12-3b-fluide.apk')
new=Path(r'C:\Dev\JULIE\autopersonality-build-20261012\android\app\build\outputs\apk\debug\app-debug.apk')
with ZipFile(old) as a, ZipFile(new) as b:
    assert b.testzip() is None, 'APK ZIP endommagée'
    alib={x:sha256(a.read(x)).hexdigest() for x in a.namelist() if x.startswith('lib/') and x.endswith('.so')}
    blib={x:sha256(b.read(x)).hexdigest() for x in b.namelist() if x.startswith('lib/') and x.endswith('.so')}
    assert alib and alib==blib, f'Bibliothèques natives différentes : {set(alib)^set(blib)}'
    js=b.read('assets/julie/app.js').decode('utf-8')
    assert 'dialogue direct confirm' in js, 'Moteur de personnalité absent'
    assert 'manuels avanc' in js, 'Interface simplifiée absente'
    assert '0.3.14-autonomie-test' in js, 'Mauvaise version de l’interface'
    assert 'JULIE_001' in js, 'Identité absente'
    assert len(js)>100000, 'Bundle incomplet'
    print(f'APK OK : {len(blib)} bibliothèques natives strictement identiques à 0.3.12')
    print('Javascript, identité, contrôles ADN et interface présents')
print('SHA256 nouvelle APK : '+sha256(new.read_bytes()).hexdigest())
