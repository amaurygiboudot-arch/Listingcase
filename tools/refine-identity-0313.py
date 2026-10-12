from pathlib import Path
p=Path(r'C:\Dev\JULIE\learning-integration-20261011\julie-v3-genesis\www\identity-reference.mjs')
s=p.read_text(encoding='utf-8').replace('/[?!.,:;]/g','/[?!.,:;\\-]/g')
start=s.index('export function hasRoleConfusion')
s=s[:start]+"""export function hasRoleConfusion(text){
 return correctDirectAddress(text)!==text
  || /^(?:Je m'appelle Amaury|Tu t'appelles Julie)(?:[.!?,\\s]|$)/i.test(text);
}
export function correctDirectAddress(text){
 return text.replace(/^(bonjour|salut|coucou)([ ,]+)Julie\\b/gi,(_,g,sep)=>g+sep+IDENTITY_REFERENCE.user)
  .replace(/\\b(pas vrai|n'est-ce pas)([ ,]+)Julie([ ?!.]*)$/gi,(_,g,sep,end)=>g+sep+IDENTITY_REFERENCE.user+end);
}
"""
p.write_text(s,encoding='utf-8')
