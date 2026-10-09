import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFabricIndices,JULIE_OUTFITS,attachJulieWardrobe} from '../www/julie-wardrobe.mjs';
import {femaleComponentsToRemove} from '../www/genesis-female-topology.mjs';

test('Habillage: ne conserver que les surfaces de peau dans le patron',()=>{
  const pts=[
    [-.10,1.17,.11],[.10,1.17,.11],[.10,1.24,.10],[-.10,1.24,.10],
    [-.12,.80,.10],[.12,.80,.10],[.12,.90,.10],[-.12,.90,.10],
    [.41,1.21,.14],[.48,1.26,.13],[.40,1.29,.15]
  ];
  const indices=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10];
  const geometry={attributes:{position:{
    count:pts.length,getX:i=>pts[i][0],getY:i=>pts[i][1],getZ:i=>pts[i][2]
  }},index:{count:indices.length,getX:i=>indices[i]}};
  assert.deepEqual(selectFabricIndices(geometry,'upper'),[0,1,2,0,2,3]);
  assert.deepEqual(selectFabricIndices(geometry,'lower'),[4,5,6,4,6,7]);
  assert.throws(()=>selectFabricIndices(geometry,'unknown'),/inconnue/);
  assert.deepEqual(JULIE_OUTFITS,['rose','bleu','vert']);
});

test('Topologie féminine: seules les petites pièces compatibles sont ciblées',()=>{
  const box={min:{x:-.4,y:0,z:-.3},max:{x:.4,y:1.75,z:.3}};
  const group=(n,x,y,z,dx=.02,dy=.025,dz=.02)=>({
    vertices:Array.from({length:n},(_,i)=>i),
    minX:x-dx,maxX:x+dx,minY:y-dy,maxY:y+dy,minZ:z-dz,maxZ:z+dz
  });
  const candidates=[
    group(56,-.01,.80,.16),group(52,.01,.81,.16),
    group(62,-.01,.83,.15),group(49,.01,.82,.16),
    group(220,0,.82,.12),
    group(4,.5,1.2,.1),group(18,.17,1.58,.06)
  ];
  const chosen=femaleComponentsToRemove(candidates,box);
  assert.equal(chosen.male.length,4);
  assert.equal(chosen.rig.length,1);
  assert.equal(chosen.hair.length,0);
  assert.equal(chosen.eye.length,0);
  assert.throws(()=>femaleComponentsToRemove(candidates,{min:{x:0,y:0,z:0},max:{x:0,y:0,z:0}}));
});

test('Aucune tenue créée sur un corps sans identification complète',()=>{
  const THREE={SkinnedMesh:class SkinnedMesh{},MeshStandardMaterial:class MeshStandardMaterial{}};
  assert.throws(()=>attachJulieWardrobe(THREE,{traverse(fn){fn({isSkinnedMesh:true,geometry:{userData:{}}})}}),/nettoyé/);
});
