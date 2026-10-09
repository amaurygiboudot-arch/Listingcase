import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {stripGenesisConstructionHelpers,GENESIS_TOPOLOGY} from '../www/genesis-body-cleanup.mjs';
import {cleanGenesisFemaleAnatomy} from '../www/genesis-female-topology.mjs';
import {attachJulieWardrobe} from '../www/julie-wardrobe.mjs';
import {attachJulieFace} from '../www/julie-face.mjs';
import {attachJulieHair} from '../www/julie-hair.mjs';
import {attachJulieNaturalSkin} from '../www/julie-natural-skin.mjs';

// Contrôle de la vraie ressource de Genesis utilisée dans l'APK (pas un mannequin
// fictif de test). En Node on neutralise uniquement les images, afin de
// pouvoir décoder la géométrie, la hiérarchie des os et les animations.
const binary=fs.readFileSync(new URL('../www/models/julie_genesis_human.glb',import.meta.url));
assert.equal(binary.toString('ascii',0,4),'glTF');
const length=binary.readUInt32LE(12);
const json=JSON.parse(binary.subarray(20,20+length).toString('utf8'));
const bufferLength=binary.readUInt32LE(20+length);
json.buffers[0].uri='data:application/octet-stream;base64,'+
  binary.subarray(28+length,28+length+bufferLength).toString('base64');
json.materials=(json.materials||[]).map(({name,alphaMode,doubleSided})=>({name,alphaMode,doubleSided}));
json.images=[];json.textures=[];
globalThis.ProgressEvent??=class ProgressEvent{
  constructor(type,properties){this.type=type;Object.assign(this,properties)}
};

const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
let mesh=null;
gltf.scene.traverse(node=>{if(node.isSkinnedMesh&&!mesh)mesh=node});
assert.ok(mesh,'GLB sans véritable maillage skinné');
const geometry=mesh.geometry;
assert.equal(geometry.attributes.position.count,GENESIS_TOPOLOGY.vertices);
assert.equal(geometry.index.count,GENESIS_TOPOLOGY.indices);
assert.ok(mesh.skeleton.bones.length>=30,'Le squelette Genesis est absent');
assert.ok(gltf.animations.length>0,'Aucune animation humaine');
const skinnedWeights=geometry.attributes.skinWeight;
const uvs=geometry.attributes.uv;
const originalBoneCount=mesh.skeleton.bones.length;
const before=geometry.index.count;
const report=stripGenesisConstructionHelpers(gltf.scene);
assert.equal(report.removedComponents,4,'La fausse jupe doit être retirée');
assert.ok(report.removedTriangles>0,'Des triangles parasites persistent');
const fem=cleanGenesisFemaleAnatomy(gltf.scene);
assert.equal(fem.malePartsRemoved,4,'Quatre composants attendus sur le GLB réel');
assert.ok(fem.removedTriangles>0,'Le nettoyage anatomique doit retirer des triangles');
const skin=attachJulieNaturalSkin(gltf.scene);
assert.equal(skin.vertices,4170,'Genesis doit préserver la surface de peau réelle');
assert.ok(skin.triangles>2000,'La peau complète doit supplanter le faux atlas de vêtements');
assert.ok(mesh.material.some(m=>m.name==='JULIE_001.natural-skin'),'Matériau peau manquant');
const wardrobe=attachJulieWardrobe(THREE,gltf.scene,{outfit:'rose'});
assert.equal(wardrobe.layers.length,2,'Deux pièces de tenue doivent suivre les os');
assert.ok(wardrobe.layers.every(layer=>layer.geometry.userData.julieFemaleTopologyCleaned===false),'Aucun vêtement ne doit imiter le corps féminin');
assert.ok(wardrobe.triangles>400,'Les vêtements doivent couvrir suffisamment de triangles humains');
assert.ok(wardrobe.layers.every(layer=>layer.isSkinnedMesh&&layer.skeleton===mesh.skeleton),'Habillage détaché du squelette');
assert.equal(wardrobe.setOutfit('bleu'),'bleu');
const face=attachJulieFace(gltf.scene);
assert.equal(face.eyeCount,2,'Deux yeux Genesis doivent rester présents');
assert.ok(face.eyeTriangles>100,'Les véritables yeux doivent être visibles');
assert.ok(face.blinkVertices>600,'Le clignement doit concerner le globe et les paupières');
const eyeMat=mesh.material.find(m=>m.name==='JULIE_001.iris.vert');
assert.ok(eyeMat,'Iris vert intégré au véritable corps');
const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
eyeMat.onBeforeCompile(shader);
assert.ok(shader.fragmentShader.includes('julieIrisColor'),'Iris vert absent du shader');
const expression=face.update(.017);
assert.ok(expression.blink>=0&&expression.blink<=1);
face.beforeMixer();
const hair=attachJulieHair(gltf.scene,{quality:'balanced'});
assert.ok(hair.rootCount>=35,'Racines absentes du véritable crâne');
assert.ok(hair.capTriangles>30,'La couverture des cheveux doit suivre la peau');
assert.ok(hair.ribbonTriangles>1000,'Les mèches doivent être réellement construites');
assert.equal(hair.head.toLowerCase(),'head');
hair.update(1.0);
assert.ok(geometry.index.count<before);
assert.equal(mesh.skeleton.bones.length,originalBoneCount);
assert.strictEqual(geometry.attributes.skinWeight,skinnedWeights);
assert.strictEqual(geometry.attributes.uv,uvs);
assert.ok(geometry.index.count>60000,'Anatomie trop amputée');
for(const g of geometry.groups)
  assert.ok(g.start+g.count<=geometry.index.count,'Groupe de matériau invalide');
console.log('PASS JULIE GLB GENESIS',JSON.stringify({
  vertices:geometry.attributes.position.count,
  skeletonBones:originalBoneCount,
  animations:gltf.animations.length,
  removedComponents:report.removedComponents,
  femaleComponents:fem.malePartsRemoved,
  clothingTriangles:wardrobe.triangles,
  skinTriangles:skin.triangles,
  eyes:face.eyeCount,
  eyelidVertices:face.blinkVertices,
  hairRoots:hair.rootCount,
  hairRibbons:hair.ribbonTriangles,
  removedTriangles:report.removedTriangles+fem.removedTriangles,
  remainingTriangles:geometry.index.count/3
}));
