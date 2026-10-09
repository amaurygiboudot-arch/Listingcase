// Calculs purs de l'affichage V3 ; testables sans navigateur ou moteur graphique.
export function clampFps(quality='balanced') {
  return quality==='eco'?30:quality==='high'?120:60;
}
export function rendererDpr(quality='balanced',devicePixelRatio=1) {
  const cap = quality==='eco'?1:quality==='high'?1.7:1.25;
  return Math.min(cap,Math.max(1,Number(devicePixelRatio)||1));
}
export function isAuthorizedAssetUrl(path) {
  return typeof path==='string'&&/^\.\/models\/[a-zA-Z0-9_-]+\.glb$/.test(path);
}
export function fitHumanModel(THREE, model,{heightMeters=1.75}={}){
  const bbox=new THREE.Box3().setFromObject(model);
  const height=bbox.max.y-bbox.min.y;
  if(!Number.isFinite(height)||height<.1||height>1000)throw new Error('Dimensions du modèle invraisemblables');
  if(!Number.isFinite(heightMeters)||heightMeters<1.3||heightMeters>2.3)throw new Error('Taille cible incorrecte');
  const centerX=(bbox.min.x+bbox.max.x)/2;
  const centerZ=(bbox.min.z+bbox.max.z)/2;
  const scale=heightMeters/height;
  model.scale.multiplyScalar(scale);
  model.position.set(-centerX*scale,-bbox.min.y*scale,-centerZ*scale);
  return {height:heightMeters,scale,centerX,centerZ};
}
