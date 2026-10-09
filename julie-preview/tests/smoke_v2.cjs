const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'www/app.mjs'),'utf8');
const html=fs.readFileSync(path.join(root,'www/index.html'),'utf8');
const manifest=fs.readFileSync(path.join(root,'android/AndroidManifest.xml'),'utf8');
assert(script.includes("const JULIE_ID = 'JULIE_001'"));
assert(script.includes("const APP_VERSION = '0.2.1'"));
assert(script.includes('JULIE_AVATAR_V2'));
assert(!script.includes('fetch('));
assert(!/android\.permission\.INTERNET/.test(manifest));
assert(manifest.includes('allowBackup="false"'));
for(const e of ['julie-3d','btn-wave','btn-outfit','chat-form','memory-items','quality','export-data'])assert(html.includes(e));

// Tiny mathematical / DOM substitute. Goal: exercise the construction path
// without an Android SDK, a GPU or a network dependency in this container.
let rendererUsed=false, roots=[],materialCount=0,geometries=0;
class Node3D {
 constructor(){this.children=[];this.rotation={x:0,y:0,z:0};this.position={x:0,y:0,z:0,set:(x,y,z)=>Object.assign(this.position,{x,y,z})};this.scale={x:1,y:1,z:1,set:(x,y,z)=>Object.assign(this.scale,{x,y,z})};this.castShadow=false;this.receiveShadow=false;}
 add(c){assert(c);this.children.push(c);return c}
}
class G extends Node3D {}
class Material { constructor(options){this.options=options;this.color={set(){}};materialCount++;}}
class Geometry {constructor(){geometries++} setAttribute(key,val){this[key]=val;return this}setIndex(idx){this.indices=idx;return this} computeVertexNormals(){} }
class Mesh extends Node3D {constructor(g,m){super();this.geometry=g;this.material=m;}}
class PseudoSphere extends Geometry {constructor(r,seg=24,h=16){super();const count=(seg+1)*(h+1);let positions=Array.from({length:count},(_,i)=>[Math.sin(i),Math.cos(i),Math.sin(i*.1)]);this.attributes={position:{count,getX:i=>positions[i][0],getY:i=>positions[i][1],getZ:i=>positions[i][2],setXYZ:(i,x,y,z)=>{positions[i]=[x,y,z]}}};}}
class Color{constructor(value){this.value=value}set(x){this.value=x}}
class Renderer{constructor(){rendererUsed=true;this.shadowMap={enabled:false}}setClearColor(){}setPixelRatio(){}setSize(){}render(){}}
class PseudoCamera extends Node3D{constructor(){super();this.aspect=1;this.fov=39}lookAt(){}updateProjectionMatrix(){}}
const THREE={Group:G,Scene:G,Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 SphereGeometry:PseudoSphere,BoxGeometry:Geometry,PlaneGeometry:Geometry,CircleGeometry:Geometry,
 TubeGeometry:Geometry,Float32BufferAttribute:class{constructor(a,n){this.array=a;this.itemSize=n}},BufferGeometry:Geometry,
 Color,Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z}},CatmullRomCurve3:class{constructor(points){this.points=points}},
 WebGLRenderer:Renderer,PerspectiveCamera:PseudoCamera,HemisphereLight:G,DirectionalLight:G,PointLight:G,Fog:class{},
 MathUtils:{clamp:(v,min,max)=>Math.max(min,Math.min(max,v))},ACESFilmicToneMapping:2,SRGBColorSpace:1,DoubleSide:2};
const els=new Map();
function el(id){if(!els.has(id)){els.set(id,{id,innerHTML:'',textContent:'',value:'balanced',children:[],style:{},hidden:true,addEventListener(){},appendChild(n){this.children.push(n)},getBoundingClientRect(){return {width:400,height:700}},setPointerCapture(){}});}return els.get(id)}
const document={querySelector:el,querySelectorAll:()=>[],createElement:tag=>el('generated-'+Math.random()),createTextNode:text=>({text})};
const localStorage={getItem:()=>null,setItem(){}};
const context={THREE,document,window:{devicePixelRatio:2,addEventListener(){}},performance:{now:()=>100},requestAnimationFrame:()=>0,confirm:()=>true,alert:()=>{},console,localStorage,Date,Math};
vm.createContext(context);
vm.runInContext(script.replace("import * as THREE from 'three';",'const THREE = globalThis.THREE;'),context,{timeout:30000,filename:'julie-v2-stub-runtime.js'});
assert.equal(rendererUsed,true);
assert(geometries>55,'Expected substantial 3D geometry construction');
assert(materialCount>20,'Expected multiple scene materials');
assert(els.get('#conversation').children.length>=1);
vm.runInContext('outfitIdx=2; outfitMaterial.color.set(outfitColors[outfitIdx]);',context,{timeout:1000});
console.log('PASS: syntaxes et invariants de sécurité');
console.log('PASS: scène et avatar V2 instanciés dans un environnement simulé');
console.log('PASS: dialogue de démonstration conservé et palette de tenues fonctionnelle');
console.log('Geometry allocations:',geometries,'materials:',materialCount);

// Régression JULIE V2.1 : une robe unifiée doit couvrir le bassin sans surfaces percées.
assert(script.includes('JULIE_V21_NO_CLIPPING'));
assert(script.includes('JULIE_V21_CONTINUOUS_DRESS'));
assert(script.includes('torso=skirt'));
const findRings=(name)=>{
  const match=script.match(new RegExp('const '+name+'=\\[([\\s\\S]*?)\\];'));
  assert(match,'Profil absent: '+name);
  return Array.from(match[1].matchAll(/\{([^}]+)\}/g),([,block])=>Object.fromEntries(Array.from(block.matchAll(/([a-z]+):(-?(?:\d+(?:\.\d*)?|\.\d+))/g),([,key,value])=>[key,Number(value)])));
};
const skin=findRings('pelvicSkinRings'),cloth=findRings('dressRings');
const at=(arr,y,key)=>{for(let i=0;i<arr.length-1;i++){const a=arr[i],b=arr[i+1];if(y>=a.y&&y<=b.y){const t=(y-a.y)/(b.y-a.y);return a[key]*(1-t)+b[key]*t}}throw new Error('profil y='+y)};
for(let i=0;i<59;i++){const y=.79+i*.005;for(const dim of ['rx','rz'])assert(at(cloth,y,dim)>at(skin,y,dim)+.009,`Intersection robe/bassin à y=${y}, dim=${dim}`)}
console.log('PASS: aucune intersection robe/bassin de 0.79 à 1.08 m (profil géométrique)');
