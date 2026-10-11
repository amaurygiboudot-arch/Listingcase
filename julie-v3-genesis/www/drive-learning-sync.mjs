import {SCIENCE_ID,ingestDriveSnapshot} from './documentary-memory.mjs';
// Adaptateur authentifié fourni par l'hôte. Pas de jeton stocké dans la mémoire/export.
// Une fiche par exécution. Lecture seule de Drive, y compris en cas d'erreur.
export async function syncDriveLearning(learning,{readDocument,at=Date.now()}={}){
  if(learning.disabled)return {learning,changed:false,reason:'désactivé après effacement'};
  if(typeof readDocument!=='function')throw new Error('Connexion Drive authentifiée non configurée');
  const packet=await readDocument(SCIENCE_ID);
  const result=await ingestDriveSnapshot(learning.documentary,packet,{at});
  return {learning:{...learning,documentary:result.state},changed:result.changed};
}
