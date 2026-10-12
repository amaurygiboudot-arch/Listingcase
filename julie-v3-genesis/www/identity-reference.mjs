// Read-only snapshot: Document maître JULIE V1.2, Identité initiale, read 2026-10-12.
// Describes the avatar, not a physical body. No automatic rewriting from chat.
export const IDENTITY_REFERENCE=Object.freeze({
 assistant:'Julie',user:'Amaury',
 source:'Julie_Document_Maitre_V1_2_Code_Source.docx — Identité initiale',
 verifiedAt:'2026-10-12',
 appearance:'Mon apparence de référence : une silhouette fine, 1,75 m, des cheveux blonds mi-longs, des yeux verts et un visage expressif.'
});
const normalize=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/[?!.,:;\-]/g,' ').replace(/\s+/g,' ').trim();
export function appearanceReply(text){
 const t=normalize(text).replace(/^(?:julie |dis moi |peux tu |est ce que tu peux )/,'');
 if(/^(?:a (?:quoi|qui) (?:tu ressembles|ressembles tu)|comment (?:tu es|es tu) physiquement|decris (?:toi|ton apparence|ton physique)|tu ressembles a quoi)(?: physiquement)?(?: s'il te plait| stp)?$/.test(t))
  return IDENTITY_REFERENCE.appearance;
 if(/^(?:quelle (?:est ta taille|taille fais tu)|tu mesures combien)$/.test(t))
  return "Ma taille de référence est de 1,75 m.";
 if(/^(?:de quelle couleur sont tes yeux|quelle est la couleur de tes yeux|tu as les yeux de quelle couleur)$/.test(t))
  return "Mes yeux sont verts dans mon apparence de référence.";
 if(/^(?:comment sont tes cheveux|de quelle couleur sont tes cheveux|tu as les cheveux comment)$/.test(t))
  return "Mes cheveux de référence sont blonds et mi-longs.";
 return null;
}
// Narrow markers from observed identity inversions. Archives remain untouched.
export function hasRoleConfusion(text){
 return correctDirectAddress(text)!==text
  || /^(?:Je m'appelle Amaury|Tu t'appelles Julie)(?:[.!?,\s]|$)/i.test(text);
}
export function correctDirectAddress(text){
 return text.replace(/^(bonjour|salut|coucou)([ ,]+)Julie\b/gi,(_,g,sep)=>g+sep+IDENTITY_REFERENCE.user)
  .replace(/\b(pas vrai|n'est-ce pas)([ ,]+)Julie([ ?!.]*)$/gi,(_,g,sep,end)=>g+sep+IDENTITY_REFERENCE.user+end)
  .replace(/\b(pour toi|avec toi|près de toi|à tes côtés|bonne nuit)(,?\s+)Julie(?=[.!?](?:\s|$))/gi,(_,g,sep)=>g+sep+IDENTITY_REFERENCE.user);
}
