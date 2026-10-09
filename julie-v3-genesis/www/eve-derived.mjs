/**
 * Adaptation ciblée des principes du rendu féminin de Genesis.
 * Base commune : MakeHuman/MPFB CC0 (vsim human.glb, également employé dans Genesis).
 * Ce module ne copie PAS l'identité narrative ni les données personnelles d'Ève.
 * Les variations anatomiques sont modestes, continues et appliquées au maillage skinné,
 * sans ajouter de sphères/cylindres et sans toucher aux poids d'armature.
 */
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const bell=(x,center,width)=>Math.exp(-Math.pow((x-center)/width,2));

export function eveDerivedFemaleWidthAtHeight(fraction){
  const y=clamp(fraction,0,1);
  // Variation très légère : épaules moins larges, taille dessinée, bassin naturel.
  return 1-.035*bell(y,.79,.09)-.072*bell(y,.57,.09)+.055*bell(y,.47,.075);
}

export function eveDerivedFemaleDepthAtHeight(fraction,front=false){
  const y=clamp(fraction,0,1);
  return 1-.028*bell(y,.55,.10)+.035*bell(y,.49,.08)+(front ? .035*bell(y,.71,.065) : 0);
}

export function adaptEveDerivedFemaleMesh(root){
  if(!root?.traverse)throw new Error('Scène 3D absente');
  let candidates=0,vertices=0;
  root.traverse(node=>{
    if(!node.isSkinnedMesh||!node.geometry?.attributes?.position)return;
    const geometry=node.geometry;
    const position=geometry.attributes.position;
    if(position.count<5000)return;
    if(!geometry.boundingBox)geometry.computeBoundingBox();
    const box=geometry.boundingBox;
    const height=box.max.y-box.min.y;
    if(!Number.isFinite(height)||height<.2)return;
    // Les autres maillages, les textures, les os et les clips restent inchangés.
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      const fraction=(y-box.min.y)/height;
      const w=eveDerivedFemaleWidthAtHeight(fraction);
      const d=eveDerivedFemaleDepthAtHeight(fraction,z>(box.min.z+box.max.z)*.5);
      position.setXYZ(i,x*w,y,z*d);
    }
    position.needsUpdate=true;
    geometry.computeVertexNormals?.();
    geometry.computeBoundingBox?.();
    geometry.computeBoundingSphere?.();
    geometry.userData={...geometry.userData,julieEveDerivedFemale:true};
    candidates++;vertices+=position.count;
  });
  if(candidates<1)throw new Error('Maillage skinné humain absent du modèle importé');
  return {modifiedMeshes:candidates,modifiedVertices:vertices,source:'genesis-eve-female-approach'};
}

export function normalizeGenesisMaterials(THREE,root){
  let corrected=0,eyeTinted=0,hairTinted=0;
  root.traverse(node=>{
    if(!node.isMesh)return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    for(const m of materials){
      if(!m)return;
      const n=String(m.name||'').toLowerCase();
      // Correction du GLB utilisée également dans Genesis : l'alpha BLEND de
      // l'atlas corporel fait disparaître des pans de peau (depthWrite=false).
      // Ne toucher ni aux cils, ni aux cheveux découpés par alpha.
      if((/human.*body|body.*skin|skin.*body/.test(n)||
          (node.isSkinnedMesh&&!/hair|eye|lash|cloth|dress/.test(n)))&&
          m.opacity>=.999&&!m.alphaMap){
        if(m.transparent||m.depthWrite===false){m.transparent=false;m.depthWrite=true;m.needsUpdate=true;corrected++;}
      }
      if(/iris/.test(n)&&m.color){m.color.set(0x568c70);m.needsUpdate=true;eyeTinted++;}
      if(/hair/.test(n)&&m.color){m.color.copy(new THREE.Color(0xdab77e));m.needsUpdate=true;hairTinted++;}
    }
  });
  return {corrected,eyeTinted,hairTinted};
}
