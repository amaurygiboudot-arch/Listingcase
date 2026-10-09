import test from 'node:test';
import assert from 'node:assert/strict';
import {eveDerivedFemaleWidthAtHeight,eveDerivedFemaleDepthAtHeight,adaptEveDerivedFemaleMesh,normalizeGenesisMaterials} from '../www/eve-derived.mjs';

const attr=(values)=>({
 count:values.length,getX:i=>values[i][0],getY:i=>values[i][1],getZ:i=>values[i][2],
 setXYZ:(i,x,y,z)=>values[i]=[x,y,z],needsUpdate:false
});

test('Morphologie Ève : taille affinée, bassin naturel, épaules proportionnées',()=>{
 assert.ok(eveDerivedFemaleWidthAtHeight(.57)<.95);
 assert.ok(eveDerivedFemaleWidthAtHeight(.47)>1);
 assert.ok(eveDerivedFemaleWidthAtHeight(.79)<1);
 for(let i=0;i<=100;i++){
  const y=i/100;
  const w=eveDerivedFemaleWidthAtHeight(y),d=eveDerivedFemaleDepthAtHeight(y,true);
  assert.ok(w>.8&&w<1.15&&Number.isFinite(w));
  assert.ok(d>.8&&d<1.15&&Number.isFinite(d));
 }
});

test('Maillage skinné reste continu et les os ne changent pas',()=>{
 const points=Array.from({length:6001},(_,i)=>[i%2?.08:-.08,.1+(i%101)*.015,(i%3-1)*.07]);
 const before=[...points.map(v=>v.slice())];
 const position=attr(points);const geometry={attributes:{position},userData:{existing:'genesis'},
   boundingBox:{min:{y:.1,z:-.07},max:{y:1.6,z:.07}},
   computeVertexNormals(){this.normals=true},computeBoundingBox(){},computeBoundingSphere(){}};
 const bones=Array.from({length:53},(_,i)=>({name:'joint_'+i}));
 const material={name:'Human.body',opacity:1,transparent:true,depthWrite:false,needsUpdate:false};
 const skinned={isSkinnedMesh:true,isMesh:true,geometry,material,skeleton:{bones}};
 const root={traverse(fn){fn(skinned)}};
 const result=adaptEveDerivedFemaleMesh(root);
 assert.equal(result.modifiedVertices,6001);
 assert.equal(skinned.skeleton.bones,bones);
 assert.equal(skinned.material,material);
 assert.ok(geometry.normals);
 assert.ok(geometry.userData.julieEveDerivedFemale);
 assert.ok(points.some((v,i)=>v[0]!==before[i][0]));
 assert.ok(points.every(v=>v.every(Number.isFinite)));
 const state=normalizeGenesisMaterials({},root);
 assert.equal(state.corrected,1);
 assert.equal(material.transparent,false);
 assert.equal(material.depthWrite,true);
});

test('Aucun modèle jouet de secours si le maillage humain est absent',()=>{
 assert.throws(()=>adaptEveDerivedFemaleMesh({traverse(fn){fn({isSkinnedMesh:false})}}),/Maillage skinné/);
});
