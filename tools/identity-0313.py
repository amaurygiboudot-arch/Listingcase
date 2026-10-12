from pathlib import Path
r=Path(r'C:\Dev\JULIE\learning-integration-20261011')
p=r/'julie-v3-genesis/www/dialogue-profile.mjs'
s=p.read_text(encoding='utf-8')
s="import {appearanceReply} from './identity-reference.mjs';\n"+s
s=s.replace(' const t=normalize(text);',' const appearance=appearanceReply(text);if(appearance)return appearance;\n const t=normalize(text);')
p.write_text(s,encoding='utf-8')
p=r/'julie-v3-genesis/www/dialogue-context.mjs'
s=p.read_text(encoding='utf-8')
s="import {hasRoleConfusion} from './identity-reference.mjs';\n"+s
s=s.replace("if(m.role==='user')return true;","if(m.role==='user')return true;\n    if(hasRoleConfusion(m.text))return false;")
p.write_text(s,encoding='utf-8')
p=r/'julie-v3-genesis/www/local-conversation.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace("Tu es Julie, femme adulte, compagne virtuelle d'Amaury.","Tu es Julie. Tu réponds à Amaury, ton compagnon. Julie = toi ; Amaury = utilisateur. Tu es une femme adulte virtuelle.")
p.write_text(s,encoding='utf-8')
p=r/'julie-v3-genesis/www/dialogue-guard.mjs'
s=p.read_text(encoding='utf-8')
s="import {correctDirectAddress} from './identity-reference.mjs';\n"+s
s=s.replace(' const key=normalizeDialogue(reply);',' reply=correctDirectAddress(reply);\n const key=normalizeDialogue(reply);')
p.write_text(s,encoding='utf-8')
p=r/'julie-v3-genesis/www/app.mjs'
s=p.read_text(encoding='utf-8').replace('0.3.12-3b-fluide-test','0.3.13-identite-test')
p.write_text(s,encoding='utf-8')
p=Path(r'C:\Dev\JULIE\learning-build-20261011\android\app\build.gradle')
s=p.read_text().replace('300008','300009').replace('0.3.12-3b-fluide-test','0.3.13-identite-test')
p.write_text(s)
print('Identity and appearance corrections applied')
