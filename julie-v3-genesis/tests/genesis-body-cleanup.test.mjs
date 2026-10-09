import test from 'node:test';
import assert from 'node:assert/strict';
import {stripGenesisConstructionHelpers,GENESIS_TOPOLOGY} from '../www/genesis-body-cleanup.mjs';

function mockGenesis(){
  const sets=[
    {n:4170,minY:.09,maxY:1.46},
    {n:2392,minY:.11,maxY:1.44},
    {n:740,minY:.13,maxY:.97},
    {n:235,minY:0,maxY:.11},
    {n:235,minY:0,maxY:.11},
    {n:14061,minY:0,maxY:1.75}
  ];
  assert.equal(sets.reduce((s,v)=>s+v.n,0),GENESIS_TOPOLOGY.vertices);
  const y=new Float32Array(GENESIS_TOPOLOGY.vertices),indices=[];
  let next=0;
  for(const group of sets){
    const first=next;
    for(let i=0;i<group.n;i++)
      y[next++]=group.minY+(group.maxY-group.minY)*i/(group.n-1);
    for(let i=1;i<group.n-1;i++)indices.push(first,first+i,first+i+1);
  }
  while(indices.length<GENESIS_TOPOLOGY.indices)indices.push(0,1,2);
  const position={count:y.length,getY(i){return y[i]}};
  const uv={id:'texture-coordinates'},skinWeight={id:'skin-weights'};
  const skeleton={bones:Array.from({length:53},(_,i)=>({id:i}))};
  const geometry={
    attributes:{position,uv,skinWeight},
    morphAttributes:{position:[{label:'original-morphs'}]},
    index:{array:indices,count:indices.length,getX(i){return this.array[i]}},
    groups:[{start:0,count:indices.length,materialIndex:2}],
    userData:{source:'genesis'},
    setIndex(values){this.index={array:values,count:values.length,getX(i){return this.array[i]}}},
    clearGroups(){this.groups=[]},
    addGroup(start,count,materialIndex){this.groups.push({start,count,materialIndex})}
  };
  const mesh={isSkinnedMesh:true,geometry,skeleton,material:{name:'Human.body'}};
  return {root:{traverse(callback){callback(mesh)}},mesh,geometry,uv,skinWeight,skeleton};
}

test('Enlever la fausse jupe et trois coquilles tout en gardant le corps',()=>{
  const {root,mesh,geometry,uv,skinWeight,skeleton}=mockGenesis();
  const report=stripGenesisConstructionHelpers(root);
  assert.equal(report.cleanedMeshes,1);
  assert.equal(report.removedComponents,4);
  assert.equal(report.hiddenVertices,2392+740+235*2);
  assert.ok(report.removedTriangles>1000);
  assert.ok(geometry.index.count<GENESIS_TOPOLOGY.indices);
  assert.deepEqual(geometry.groups,[{start:0,count:geometry.index.count,materialIndex:2}]);
  assert.equal(geometry.attributes.uv,uv);
  assert.equal(geometry.attributes.skinWeight,skinWeight);
  assert.equal(mesh.skeleton,skeleton);
  assert.equal(geometry.morphAttributes.position[0].label,'original-morphs');
  assert.ok(geometry.index.array.some(i=>i===4170-1));
  assert.ok(geometry.index.array.some(i=>i===GENESIS_TOPOLOGY.vertices-1));
  assert.ok(geometry.index.array.every(i=>i<4170||i>=4170+2392+740+235*2));
});

test('Un nouveau modèle inconnu n’est jamais découpé silencieusement',()=>{
  const f=mockGenesis();
  f.geometry.index.array[6]=4170;
  assert.throws(()=>stripGenesisConstructionHelpers(f.root),/Gabarits vestimentaires/);
  assert.equal(f.geometry.index.count,GENESIS_TOPOLOGY.indices);
  assert.equal(f.geometry.userData.julieConstructionHelpersRemoved,undefined);
});

test('Impossible de masquer par erreur les mêmes triangles deux fois',()=>{
  const f=mockGenesis();
  stripGenesisConstructionHelpers(f.root);
  assert.throws(()=>stripGenesisConstructionHelpers(f.root),/Topologie Genesis attendue/);
});
