import * as THREE from 'three';
import {connectedComponents} from './genesis-female-topology.mjs';

/**
 * Remove the original MakeHuman construction/garment atlas from the authored
 * skin surface. This is the same 4170-vertex body component recognized by
 * Genesis human-body-morphology + human-anatomy-template.
 * Keep native facial / hand / foot textures and every skeleton weight.
 */
function skinTexture(){
  const size=128,data=new Uint8Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const id=(y*size+x);
    const hash=(Math.imul(x+83,73856093)^Math.imul(y+7,19349663))>>>0;
    const fine=(hash%1024)/1023;
    const soft=.5+.25*Math.sin(x*.37+y*.49)*Math.sin(y*.53-x*.19);
    data[id]=Math.round(102+54*(fine*.68+soft*.32));
  }
  const tex=new THREE.DataTexture(data,size,size,THREE.RedFormat,THREE.UnsignedByteType);
  tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
  tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps=true;tex.repeat.set(3,3);tex.needsUpdate=true;
  tex.name='JULIE_001.skin.fine-pore-relief';
  return tex;
}

export function attachJulieNaturalSkin(model){
  if(!model?.traverse)throw Error('Source humaine Genesis absente');
  let mesh=null;
  model.traverse(obj=>{
    if(obj.isSkinnedMesh&&obj.geometry?.userData?.julieFemaleTopologyCleaned&&
       obj.geometry.index?.count>50000&&obj.geometry.attributes.position?.count===21833)
      mesh=obj;
  });
  if(!mesh||!mesh.skeleton)throw Error('Véritable corps Genesis non retrouvé');
  const g=mesh.geometry;
  if(g.userData?.julieSkinRecolored)throw Error('Peau de Julie déjà préparée');
  const groups=connectedComponents(g);
  const match=groups.filter(group=>
    group.vertices.length===4170&&group.minY>.09&&group.maxY<1.46
  );
  if(match.length!==1)throw Error('Surface corporelle Genesis de 4170 sommets inconnue');
  const region=new Set(match[0].vertices),original=g.index;
  const oldGroups=g.groups?.length?g.groups.map(x=>({...x})):
    [{start:0,count:original.count,materialIndex:0}];
  const keep=[],nextGroups=[],skin=[];
  for(const group of oldGroups){
    const start=keep.length,end=Math.min(original.count,group.start+group.count);
    for(let k=group.start;k+2<end;k+=3){
      const a=original.getX(k),b=original.getX(k+1),c=original.getX(k+2);
      if(region.has(a)&&region.has(b)&&region.has(c))skin.push(a,b,c);
      else keep.push(a,b,c);
    }
    if(keep.length>start)nextGroups.push({start,count:keep.length-start,materialIndex:group.materialIndex});
  }
  if(skin.length<6000||keep.length<10000)
    throw Error('Répartition de peau et visage impossible sans supprimer l’anatomie');
  const previous=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const pores=skinTexture();
  const natural=new THREE.MeshStandardMaterial({
    name:'JULIE_001.natural-skin',
    color:0xdab19c,roughness:.90,metalness:0,
    bumpMap:pores,bumpScale:.00012,
    transparent:false,depthWrite:true,side:THREE.FrontSide
  });
  g.setIndex([...keep,...skin]);g.clearGroups();
  for(const section of nextGroups)g.addGroup(section.start,section.count,section.materialIndex);
  g.addGroup(keep.length,skin.length,previous.length);
  mesh.material=[...previous,natural];
  g.userData={...g.userData,julieSkinRecolored:true};
  return {
    vertices:region.size,triangles:skin.length/3,material:natural,
    // Consumers should not dispose this until Julie releases the body itself.
    dispose(){natural.dispose();pores.dispose();}
  };
}
