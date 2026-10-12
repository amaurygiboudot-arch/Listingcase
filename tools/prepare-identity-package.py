from pathlib import Path
r=Path(r'C:\Dev\JULIE\learning-integration-20261011')
s=(r/'tools/package-speed-delta.py').read_text(encoding='utf-8')
s=s.replace('JULIE-TEST-0.3.12-3b-fluide.apk','JULIE-TEST-0.3.13-identite.apk').replace('JULIE-TEST-0.3.11-3b-optimise.apk','JULIE-TEST-0.3.12-3b-fluide.apk')
s=s.replace('75b4c168dbd2c6575e94e4132c3a190dc03d20e5a0e0f5f953d43372fcb8b965','440333d384114765fc8af6442e7e2765ad99ffbf4229aa9f089d579d46d3706c')
s=s.replace('fluide-0312-delta.gz','identite-0313-delta.gz')
(r/'tools/package-identity-delta.py').write_text(s,encoding='utf-8')
