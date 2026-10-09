import * as THREE from 'three';

/* JULIE_001: green eyes and facial motion using the original skinned Genesis body.
   No new toy eyes, head primitives or loss of the existing skeleton/UVs. */
const smooth=(v)=>{const t=Math.max(0,Math.min(1,Number(v)||0));return t*t*(3-2*t);};
const bell=(v,c,w)=>Math.exp(-Math.pow((v-c)/w,2));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

export function julieBlinkAt(time){
  const t=Math.max(0,Number(time)||0),cycle=(t+.21)%4.35;
  const pulse=(offset,width)=>offset>=0&&offset<=width?Math.sin(Math.PI*offset/width)**2:0;
  return Math.max(pulse(cycle-.04,.20),.55*pulse(cycle-.33,.12));
}
export function julieExpressionAt(time){
  const t=Math.max(0,Number(time)||0);
  return {blink:julieBlinkAt(t),
    smile:clamp(.26+.12*Math.sin(t*.27)+.05*Math.sin(t*.11+.8),0,1),
    brow:clamp(.08+.08*Math.sin(t*.62+.4),0,1),
    gazeX:.0017*Math.sin(t*.42),gazeY:.001*Math.sin(t*.33+.5)};
}

function components(g){
  const p=g.attributes.position,index=g.index,n=p.count,root=new Int32Array(n),rank=new Uint8Array(n),used=new Uint8Array(n);
  for(let i=0;i<n;i++)root[i]=i;
  const find=(a)=>{while(root[a]!==a){root[a]=root[root[a]];a=root[a];}return a;};
  const union=(a,b)=>{a=find(a);b=find(b);if(a===b)return;if(rank[a]<rank[b]){const t=a;a=b;b=t;}root[b]=a;if(rank[a]===rank[b])rank[a]++;};
  for(let k=0;k+2<index.count;k+=3){
    const a=index.getX(k),b=index.getX(k+1),c=index.getX(k+2);
    if(Math.min(a,b,c)<0||Math.max(a,b,c)>=n)throw Error('Indices humains invalides');
    used[a]=used[b]=used[c]=1;union(a,b);union(a,c);
  }
  const groups=new Map();
  for(let i=0;i<n;i++)if(used[i]){
    const r=find(i),x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    let a=groups.get(r);
    if(!a){a={ids:[],minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};groups.set(r,a);}
    a.ids.push(i);
    a.minX=Math.min(a.minX,x);a.maxX=Math.max(a.maxX,x);
    a.minY=Math.min(a.minY,y);a.maxY=Math.max(a.maxY,y);
    a.minZ=Math.min(a.minZ,z);a.maxZ=Math.max(a.maxZ,z);
  }
  return [...groups.values()];
}

export function findGenesisEyes(g){
  const two=components(g).filter(e=>e.ids.length===308&&e.minY>1.49&&e.maxY<1.54&&e.minZ>.09&&e.maxZ<.14&&Math.abs((e.minX+e.maxX)/2)>.02)
    .sort((a,b)=>(a.minX+a.maxX)-(b.minX+b.maxX));
  if(two.length!==2||(two[0].minX+two[0].maxX)*(two[1].minX+two[1].maxX)>=0){
    const all=components(g).sort((a,b)=>b.ids.length-a.ids.length);
    const near=all.slice(0,45)
      .map(e=>({count:e.ids.length,ym:[+e.minY.toFixed(4),+e.maxY.toFixed(4)],
        xm:[+e.minX.toFixed(4),+e.maxX.toFixed(4)],zm:[+e.minZ.toFixed(4),+e.maxZ.toFixed(4)]}));
    const p=g.attributes.position,idx=g.index;
    const matched=[];
    for(let i=0;i<p.count;i++)if(p.getY(i)>1.47&&p.getY(i)<1.57&&p.getZ(i)>.05){
      matched.push([p.getX(i),p.getY(i),p.getZ(i)]);
    }
    const region={count:matched.length,
      minX:Math.min(...matched.map(x=>x[0])),maxX:Math.max(...matched.map(x=>x[0])),
      minZ:Math.min(...matched.map(x=>x[2])),maxZ:Math.max(...matched.map(x=>x[2]))};
    throw Error('Deux vrais globes oculaires Genesis requis; diagnostic='+JSON.stringify({groups:near.slice(0,30),region,selected:two.length}));
  }
  return two.map(e=>({ids:e.ids,center:new THREE.Vector3((e.minX+e.maxX)/2,(e.minY+e.maxY)/2,(e.minZ+e.maxZ)/2)}));
}

function makeEyeMaterial(eyes){
  const uniforms={julieEyeLeft:{value:eyes[0].center.clone()},
    julieEyeRight:{value:eyes[1].center.clone()},
    julieEyeGaze:{value:new THREE.Vector2()},
    julieIrisColor:{value:new THREE.Color(0x367b5b)}};
  const mat=new THREE.MeshStandardMaterial({name:'JULIE_001.iris.vert',
    color:0xf2ece6,roughness:.23,metalness:0,transparent:false,depthWrite:true});
  mat.userData.julieEyeUniforms=uniforms;
  mat.onBeforeCompile=(shader)=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 julieEyeRestPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n julieEyeRestPosition=position;');
    shader.fragmentShader=[
      'varying vec3 julieEyeRestPosition;',
      'uniform vec3 julieEyeLeft;',
      'uniform vec3 julieEyeRight;',
      'uniform vec2 julieEyeGaze;',
      'uniform vec3 julieIrisColor;'
    ].join('\n')+'\n'+shader.fragmentShader;
    const frag=[
      '#include <color_fragment>',
      'vec3 julieCenter=(julieEyeRestPosition.x<0.0?julieEyeLeft:julieEyeRight);',
      'vec2 julieOffset=julieEyeRestPosition.xy-julieCenter.xy-julieEyeGaze;',
      'float julieR=length(julieOffset);',
      'float julieVisible=smoothstep(julieCenter.z+0.001,julieCenter.z+0.006,julieEyeRestPosition.z);',
      'float julieIris=julieVisible*(1.0-smoothstep(.0064,.0082,julieR));',
      'float julieLimbal=smoothstep(.0061,.0074,julieR)*julieIris*.33;',
      'vec3 julieColor=mix(julieIrisColor*.58,julieIrisColor*1.2,.5+.5*sin(julieR*760.0+atan(julieOffset.y,julieOffset.x)*19.0));',
      'julieColor*=1.0-julieLimbal;',
      'diffuseColor.rgb=mix(diffuseColor.rgb,julieColor,julieIris);',
      'float juliePupil=(1.0-smoothstep(.0027,.0037,julieR))*julieVisible;',
      'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.012,.020,.019),juliePupil);',
      'float julieGlint=(1.0-smoothstep(.0006,.0018,length(julieOffset-vec2(-.003,.003))))*julieVisible;',
      'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.96,.99,1.0),julieGlint*.91);'
    ].join('\n');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',frag);
  };
  mat.customProgramCacheKey=()=> 'julie-eye-iris-v1';
  return {material:mat,uniforms};
}
function attachEyes(mesh){
  const g=mesh.geometry,eyes=findGenesisEyes(g),eyeIds=new Set([...eyes[0].ids,...eyes[1].ids]);
  const orig=g.index,origGroups=g.groups?.length?g.groups.map(x=>({...x})):
    [{start:0,count:orig.count,materialIndex:0}];
  const kept=[],groups=[],eyeIndex=[];
  for(const section of origGroups){
    const start=kept.length,end=Math.min(orig.count,section.start+section.count);
    for(let k=section.start;k+2<end;k+=3){
      const a=orig.getX(k),b=orig.getX(k+1),c=orig.getX(k+2);
      if(eyeIds.has(a)&&eyeIds.has(b)&&eyeIds.has(c))eyeIndex.push(a,b,c);
      else kept.push(a,b,c);
    }
    if(kept.length>start)groups.push({start,count:kept.length-start,materialIndex:section.materialIndex});
  }
  if(eyeIndex.length<400||kept.length<30000)throw Error('Découpage du matériau des yeux incohérent');
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const eye=makeEyeMaterial(eyes);
  g.setIndex([...kept,...eyeIndex]);g.clearGroups();
  for(const section of groups)g.addGroup(section.start,section.count,section.materialIndex);
  g.addGroup(kept.length,eyeIndex.length,materials.length);
  mesh.material=[...materials,eye.material];
  return {eyes,eyeTriangles:eyeIndex.length/3,...eye};
}
function createFaceMorphs(mesh,eyeList){
  const g=mesh.geometry,p=g.attributes.position,previous=g.morphAttributes.position||[];
  if(g.userData?.julieFaceMorphs)throw Error('Expressions déjà attachées');
  if(previous.length&&!g.morphTargetsRelative)throw Error('Morphs du GLB incompatible');
  const eyeIds=new Set(eyeList.flatMap(e=>e.ids)),blink=new Float32Array(p.count*3);
  const smile=new Float32Array(p.count*3),brow=new Float32Array(p.count*3);
  let bCount=0,sCount=0;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=i*3;
    const center=eyeList[x<0?0:1].center;
    if(eyeIds.has(i)){
      blink[k+1]=(center.y-y)*.87;blink[k+2]=-.004;bCount++;continue;
    }
    if(y>1.47&&y<1.57&&z>.083){
      const mask=bell(Math.abs(x-center.x),.010,.012)*bell(y,center.y,.014)*smooth((z-.085)/.035);
      blink[k+1]+=(center.y-y)*mask*.86;blink[k+2]+=.0018*mask;
      const lift=bell(Math.abs(x),.037,.023)*bell(y,1.544,.013)*smooth((z-.089)/.027);
      brow[k+1]+=.003*lift;brow[k]+=-Math.sign(x)*.001*lift;
    }
    if(y>1.437&&y<1.480&&Math.abs(x)<.066&&z>.095){
      const effect=bell(y,1.455,.012)*smooth((Math.abs(x)-.016)/.027)*smooth((z-.095)/.031);
      smile[k+1]+=.0035*effect;smile[k]+=Math.sign(x)*.0012*effect;
      if(effect>.05)sCount++;
    }
  }
  if(bCount<600||sCount<2)throw Error('Régions du visage introuvables');
  const defs=[['julieBlink',blink],['julieSmile',smile],['julieBrow',brow]];
  const attrs=defs.map(([name,data])=>{const a=new THREE.Float32BufferAttribute(data,3);a.name=name;return a;});
  g.morphTargetsRelative=true;
  g.morphAttributes.position=[...previous,...attrs];
  // Preserve original UVs and weight/bone data; compute normals in bind/rest
  // space once, rather than per animation frame on a mobile processor.
  const ref=new THREE.BufferGeometry();ref.setIndex(g.index);ref.setAttribute('position',p);
  ref.computeVertexNormals();
  const normals=[];
  for(const attr of attrs){
    const geo=new THREE.BufferGeometry();geo.setIndex(g.index);
    const temp=p.clone();
    for(let i=0;i<p.count;i++)temp.setXYZ(i,p.getX(i)+attr.getX(i),p.getY(i)+attr.getY(i),p.getZ(i)+attr.getZ(i));
    geo.setAttribute('position',temp);geo.computeVertexNormals();
    const n=geo.attributes.normal;
    for(let i=0;i<n.count;i++)n.setXYZ(i,
      n.getX(i)-ref.attributes.normal.getX(i),
      n.getY(i)-ref.attributes.normal.getY(i),
      n.getZ(i)-ref.attributes.normal.getZ(i));
    n.name=attr.name;normals.push(n);geo.dispose();
  }
  g.morphAttributes.normal=[...(g.morphAttributes.normal||[]),...normals];ref.dispose();
  g.userData={...g.userData,julieFaceMorphs:true};
  mesh.updateMorphTargets();
  if(!defs.every(([name])=>Number.isInteger(mesh.morphTargetDictionary?.[name])))
    throw Error('Les expressions ne sont pas liées au maillage');
  return {dictionary:mesh.morphTargetDictionary,blinkVertices:bCount,smileVertices:sCount};
}
function findHeadBone(model){
  let head=null;
  model.traverse(node=>{if(!head&&node.isBone&&String(node.name||'').toLowerCase()==='head')head=node;});
  return head;
}

export function attachJulieFace(model){
  if(!model?.traverse)throw Error('Julie: modèle Genesis absent');
  let human=null;
  model.traverse(node=>{
    if(node.isSkinnedMesh&&node.geometry?.userData?.julieFemaleTopologyCleaned)human=node;
  });
  if(!human?.skeleton)throw Error('Corps féminin Genesis non reconnu');
  const eye=attachEyes(human),morph=createFaceMorphs(human,eye.eyes);
  const head=findHeadBone(model),influences=human.morphTargetInfluences;
  let time=0,baseHead=null;
  function beforeMixer(){
    if(head&&baseHead){head.quaternion.copy(baseHead);baseHead=null;}
  }
  function update(delta){
    time+=clamp(delta,0,.075);
    const state=julieExpressionAt(time);
    influences[morph.dictionary.julieBlink]=state.blink;
    influences[morph.dictionary.julieSmile]=state.smile;
    influences[morph.dictionary.julieBrow]=state.brow;
    eye.uniforms.julieEyeGaze.value.set(state.gazeX,state.gazeY);
    if(head){
      baseHead=head.quaternion.clone();
      head.rotateY(.012*Math.sin(time*.45));
      head.rotateX(.008*Math.sin(time*.30+.2));
    }
    return state;
  }
  return {eyeCount:eye.eyes.length,eyeTriangles:eye.eyeTriangles,
    headBone:head?.name||null,blinkVertices:morph.blinkVertices,
    smileVertices:morph.smileVertices,beforeMixer,update,
    dispose(){beforeMixer();eye.material.dispose();}};
}
