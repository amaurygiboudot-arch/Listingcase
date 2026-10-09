/**
 * Première tenue légère pour JULIE_001, basée sur la peau skinnée Genesis.
 * À la différence d'une robe faite de cylindres, les panneaux sont extraits
 * du maillage humain riggé : les mêmes os les animent, sans coût réseau.
 * C'est un prototype de vêtements ajustés, pas encore une simulation de tissu.
 */
export const JULIE_OUTFITS=Object.freeze(['rose','bleu','vert']);
const COLORS=Object.freeze({
  rose:{upper:0xbf718a,lower:0x986577},
  bleu:{upper:0x5b85a1,lower:0x36526a},
  vert:{upper:0x769b84,lower:0x456b62}
});
const REGION=Object.freeze({
  upper:{minY:1.055,maxY:1.395,maxX:.297,maxZ:.255},
  lower:{minY:.705,maxY:1.064,maxX:.300,maxZ:.258}
});
export function selectFabricIndices(geometry,name){
  const pos=geometry?.attributes?.position,idx=geometry?.index;
  const region=REGION[name];
  if(!region||!pos||!idx)throw new Error('Zone de vêtement inconnue');
  const inside=i=>{
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    return y>=region.minY&&y<=region.maxY &&
      Math.abs(x)<=region.maxX && Math.abs(z)<=region.maxZ;
  };
  const insideCache=new Int8Array(pos.count);
  insideCache.fill(-1);
  function ok(i){
    if(insideCache[i]<0)insideCache[i]=inside(i)?1:0;
    return insideCache[i]===1;
  }
  const result=[];
  for(let k=0;k+2<idx.count;k+=3){
    const a=idx.getX(k),b=idx.getX(k+1),c=idx.getX(k+2);
    if(ok(a)&&ok(b)&&ok(c))result.push(a,b,c);
  }
  return result;
}
function fittedGeometry(original,indices){
  const clone=original.clone();
  // Un vêtement ne peut pas se déclarer corps humain Genesis.
  clone.userData={...clone.userData,julieWardrobeSurface:true,julieFemaleTopologyCleaned:false};
  clone.setIndex(indices);
  clone.clearGroups();
  const touched=new Set(indices);
  const pos=clone.attributes.position,normal=clone.attributes.normal;
  // Relief de tissu d'environ 6 mm : évite le scintillement de la peau dessous.
  for(const i of touched){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    if(normal){
      pos.setXYZ(i,x+normal.getX(i)*.006,y+normal.getY(i)*.006,z+normal.getZ(i)*.006);
    }else{
      const magnitude=Math.max(.03,Math.hypot(x,z));
      pos.setXYZ(i,x+x/magnitude*.006,y,z+z/magnitude*.006);
    }
  }
  pos.needsUpdate=true;
  clone.computeBoundingSphere?.();
  return clone;
}
export function attachJulieWardrobe(THREE,root,{outfit='rose'}={}){
  if(!root?.traverse||!THREE?.SkinnedMesh||!THREE?.MeshStandardMaterial)
    throw new Error('Moteur de vêtements 3D indisponible');
  let source=null;
  root.traverse(mesh=>{
    if(mesh.isSkinnedMesh&&mesh.geometry?.userData?.julieFemaleTopologyCleaned)source=mesh;
  });
  if(!source||!source.parent||!source.skeleton)
    throw new Error('Corps riggé nettoyé requis avant habillage');
  const geometry=source.geometry;
  const upperIndices=selectFabricIndices(geometry,'upper');
  const lowerIndices=selectFabricIndices(geometry,'lower');
  // Une base inconnue n'autorise pas de sous-vêtement incohérent au hasard.
  if(upperIndices.length<600||lowerIndices.length<600)
    throw new Error('Patron textile incompatible avec cette topologie humaine');
  const layers=[];
  for(const [kind,indices] of [['upper',upperIndices],['lower',lowerIndices]]){
    const mat=new THREE.MeshStandardMaterial({
      color:COLORS.rose[kind],roughness:.94,metalness:0,
      side:THREE.DoubleSide,transparent:false,depthWrite:true
    });
    const garment=new THREE.SkinnedMesh(fittedGeometry(geometry,indices),mat);
    garment.name=kind==='upper'?'julie-top-fitted':'julie-short-fitted';
    garment.bindMode=source.bindMode;
    garment.position.copy(source.position);
    garment.quaternion.copy(source.quaternion);
    garment.scale.copy(source.scale);
    garment.bind(source.skeleton,source.bindMatrix);
    garment.frustumCulled=false;
    garment.castShadow=false;garment.receiveShadow=true;
    source.parent.add(garment);
    layers.push(garment);
  }
  function setOutfit(palette){
    const safe=JULIE_OUTFITS.includes(palette)?palette:'rose';
    layers[0].material.color.setHex(COLORS[safe].upper);
    layers[1].material.color.setHex(COLORS[safe].lower);
    return safe;
  }
  setOutfit(outfit);
  return {
    layers,triangles:(upperIndices.length+lowerIndices.length)/3,
    setOutfit,
    dispose(){
      for(const layer of layers){
        layer.parent?.remove(layer);
        layer.geometry.dispose();
        layer.material.dispose();
      }
    }
  };
}
