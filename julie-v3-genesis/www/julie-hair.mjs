import * as THREE from 'three';

/**
 * JULIE_001 — cheveux blonds mi-longs, greffés au véritable crâne riggé.
 * Reprend le principe Genesis des racines dérivées des sommets attachés
 * à l'os head ; jamais un casque-sphère qui écrase le visage.
 * Prototype graphique : pas encore la simulation de coiffage et pousse.
 */
const safeName=(name)=>String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function randomGenerator(seed){
  let state=seed>>>0 || 41717;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function findHead(root){
  let target=null;
  root.traverse(o=>{if(!target&&o.isBone&&safeName(o.name)==='head')target=o;});
  return target;
}
function fitScalpRoots(mesh,head){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
  const weights=g.attributes.skinWeight,indices=g.attributes.skinIndex;
  if(!n||!weights||!indices||!mesh.skeleton?.boneInverses)
    throw Error('Peau Genesis sans poids de tête ou normales');
  const headIndex=mesh.skeleton.bones.indexOf(head);
  if(headIndex<0)throw Error('Os de tête absent du corps');
  const used=new Set(g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i));
  const weighed=[],bounds=new THREE.Box3(),position=new THREE.Vector3();
  const headWeight=(i)=>{
    let w=0;
    for(let j=0;j<4;j++)if(indices.getComponent(i,j)===headIndex)w+=weights.getComponent(i,j);
    return w;
  };
  for(const i of used){
    if(headWeight(i)<.80)continue;
    position.fromBufferAttribute(p,i);
    bounds.expandByPoint(position);
    weighed.push(i);
  }
  if(weighed.length<50)throw Error('Cuir chevelu anatomique introuvable');
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(size.y<.06||size.y>.65)throw Error('Hauteur du crâne Genesis invraisemblable');
  const matrix=new THREE.Matrix4().multiplyMatrices(mesh.skeleton.boneInverses[headIndex],mesh.bindMatrix);
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
  const roots=[],scalpMask=new Uint8Array(p.count);
  for(const i of weighed){
    const point=position.fromBufferAttribute(p,i);
    const front=(point.z-center.z)/Math.max(size.z*.5,.001);
    const minimum=bounds.min.y+size.y*(front>.25?.74:front>-.2?.60:.53);
    if(point.y<minimum)continue;
    const normal=new THREE.Vector3().fromBufferAttribute(n,i).normalize();
    if(normal.y<-.18)continue;
    scalpMask[i]=1;
    roots.push({
      vertex:i,local:point.clone().addScaledVector(normal,.002).applyMatrix4(matrix),
      normal:normal.applyMatrix3(normalMatrix).normalize(),front
    });
  }
  if(roots.length<35)throw Error('Pas assez de racines sur le crâne');
  const down=new THREE.Vector3(0,-1,0).transformDirection(matrix);
  return {roots,down,scalpMask,headIndex,source:mesh,head};
}
function scalpCap(THREEunused,source,mask){
  const g=source.geometry,p=g.attributes.position,index=g.index;
  const triangles=[];
  for(let k=0;k+2<index.count;k+=3){
    const a=index.getX(k),b=index.getX(k+1),c=index.getX(k+2);
    if(mask[a]&&mask[b]&&mask[c])triangles.push(a,b,c);
  }
  if(triangles.length<100)throw Error('Coiffure insuffisamment ancrée');
  const geom=g.clone();
  geom.setIndex(triangles);
  geom.clearGroups();geom.addGroup(0,triangles.length,0);
  const normal=geom.attributes.normal;
  // Slightly raise only cap vertices; source rig, UVs and main geometry unchanged.
  for(const i of new Set(triangles)){
    p.getX(i); // Captured from the real authored mesh, not a spherical cap.
    geom.attributes.position.setXYZ(i,
      geom.attributes.position.getX(i)+normal.getX(i)*.0028,
      geom.attributes.position.getY(i)+normal.getY(i)*.0028,
      geom.attributes.position.getZ(i)+normal.getZ(i)*.0028);
  }
  geom.attributes.position.needsUpdate=true;
  geom.computeBoundingSphere();
  const mat=new THREE.MeshStandardMaterial({
    name:'JULIE_001.cheveux.blond.cuir-chevelu',
    color:0xcaa369,roughness:.91,metalness:0,
    side:THREE.DoubleSide,depthWrite:true
  });
  const cap=new THREE.SkinnedMesh(geom,mat);
  cap.bindMode=source.bindMode;
  cap.position.copy(source.position);
  cap.quaternion.copy(source.quaternion);
  cap.scale.copy(source.scale);
  cap.bind(source.skeleton,source.bindMatrix);
  cap.frustumCulled=false;cap.castShadow=false;cap.receiveShadow=true;
  cap.name='JULIE_001.scalp.realGeometry';
  source.parent.add(cap);
  return {cap,triangles:triangles.length/3};
}

/**
 * Build a few thousand low-cost textured-looking hair ribbons. All roots stay
 * on Genesis skin and inherit the authentic head bone, while tips sway gently.
 */
function ribbonGeometry(roots,down,{quality='balanced',seed=1672}={}){
  const random=randomGenerator(seed);
  const count=quality==='eco'?170:quality==='high'?430:300;
  const positions=[],colors=[],uv=[],indices=[],weights=[];
  const palettes=[0xc7a16a,0xd4ad70,0xe3c487,0xb99763,0xe5c589,0xc7a878];
  const zero=new THREE.Vector3();
  for(let strand=0;strand<count;strand++){
    const element=roots[Math.floor(random()*roots.length)],origin=element.local,normal=element.normal;
    const tangent=down.clone().addScaledVector(normal,-down.dot(normal));
    if(tangent.lengthSq()<.000001)tangent.crossVectors(normal,new THREE.Vector3(1,0,0));
    tangent.normalize();
    const lateral=new THREE.Vector3().crossVectors(tangent,normal).normalize();
    if(lateral.lengthSq()<1e-6)lateral.set(1,0,0);
    const phase=random()*Math.PI*2;
    // Back and sides fall to shoulder length; front fringe remains clear of eyes.
    const length=element.front>.33?.10+random()*.04:.23+random()*.11;
    const width=.003+random()*.0022;
    const baseColor=new THREE.Color(palettes[Math.floor(random()*palettes.length)]);
    const first=positions.length/3;
    for(let j=0;j<=8;j++){
      const t=j/8,fall=length*t;
      const wave=Math.sin(t*8.8+phase)*(.004+.005*random())*t;
      const point=origin.clone()
        .addScaledVector(tangent,fall*(1-.12*t))
        .addScaledVector(down,fall*.18*t*t)
        .addScaledVector(normal,.005+.008*Math.sin(t*Math.PI))
        .addScaledVector(lateral,wave);
      const w=Math.max(.00045,width*Math.pow(1-t,.55));
      const shade=baseColor.clone().lerp(new THREE.Color(0xf0d297),.07+.12*t);
      for(const side of [-1,1]){
        const vertex=point.clone().addScaledVector(lateral,side*w);
        positions.push(vertex.x,vertex.y,vertex.z);
        const intensity=side<0?.95:1.08;
        colors.push(shade.r*intensity,shade.g*intensity,shade.b*intensity);
        uv.push(side<0?0:1,t);
        weights.push(t*t);
      }
      if(j<8){
        const a=first+j*2,b=a+1,c=a+2,d=c+1;
        indices.push(a,c,b,b,c,d);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return {geometry,rest:new Float32Array(positions),weights:new Float32Array(weights),strands:count,triangles:indices.length/3};
}

export function attachJulieHair(model,{quality='balanced'}={}){
  if(!model?.traverse)throw Error('Julie: tête Genesis manquante');
  let source=null;
  model.traverse(obj=>{
    if(obj.isSkinnedMesh&&obj.geometry?.userData?.julieFemaleTopologyCleaned&&obj.geometry.index?.count>50000&&obj.geometry.attributes.position?.count>=20000)source=obj;
  });
  const head=findHead(model);
  if(!source||!head)throw Error('Crâne féminin articulé non trouvé');
  const scalp=fitScalpRoots(source,head);
  const crown=scalpCap(THREE,source,scalp.scalpMask);
  const hair=ribbonGeometry(scalp.roots,scalp.down,{quality});
  const material=new THREE.MeshStandardMaterial({
    name:'JULIE_001.cheveux.blonds.mi-longs',vertexColors:true,
    roughness:.83,metalness:0,side:THREE.DoubleSide,depthWrite:true,
    transparent:false
  });
  const strands=new THREE.Mesh(hair.geometry,material);
  strands.frustumCulled=false;strands.renderOrder=3;strands.castShadow=false;
  strands.name='JULIE_001.cheveux.mi-longs.naturels';
  head.add(strands);
  const a=hair.geometry.attributes.position;
  // Tiny tip motion; keep the scalp attached, never animate the whole head as a wig.
  function update(time){
    const t=Number.isFinite(time)?time:0;
    const x=hair.rest,weights=hair.weights;
    for(let i=0;i<a.count;i++){
      const k=i*3,w=weights[i];
      a.array[k]=x[k]+Math.sin(t*.93+i*.013)*.0032*w;
      a.array[k+1]=x[k+1];
      a.array[k+2]=x[k+2]+Math.cos(t*.82+i*.011)*.0026*w;
    }
    a.needsUpdate=true;
  }
  return {
    head:head.name,capTriangles:crown.triangles,ribbonTriangles:hair.triangles,
    strands:hair.strands,rootCount:scalp.roots.length,
    update,dispose(){
      strands.parent?.remove(strands);crown.cap.parent?.remove(crown.cap);
      hair.geometry.dispose();material.dispose();
      crown.cap.geometry.dispose();crown.cap.material.dispose();
    }
  };
}
