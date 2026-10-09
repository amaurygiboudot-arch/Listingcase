/**
 * JULIE_001 — adaptation du nettoyage du modèle humain CC0 de Genesis.
 * Le modèle source contient quelques petites pièces anatomiques masculines
 * déconnectées. Les variantes féminines de Genesis les excluent par indices
 * plutôt que déformer ou cacher toute la surface. Nous appliquons la même
 * méthode avant animation, sans changer les poids de peau, UV, morphs ou os.
 * Une topologie inconnue provoque une erreur plutôt qu'une mutilation.
 */
const KNOWN_VERTICES=21833;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function connectedComponents(geometry){
  const pos=geometry.attributes.position,idx=geometry.index;
  const n=pos.count,parent=new Int32Array(n),rank=new Uint8Array(n);
  for(let i=0;i<n;i++)parent[i]=i;
  const find=i=>{
    let r=i;while(parent[r]!==r)r=parent[r];
    while(parent[i]!==i){const k=parent[i];parent[i]=r;i=k;}
    return r;
  };
  const union=(a,b)=>{
    a=find(a);b=find(b);if(a===b)return;
    if(rank[a]<rank[b]){const c=a;a=b;b=c;}parent[b]=a;
    if(rank[a]===rank[b])rank[a]++;
  };
  const referenced=new Uint8Array(n);
  for(let i=0;i<idx.count;i+=3){
    const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
    if(a<0||b<0||c<0||a>=n||b>=n||c>=n)throw new Error('Indices invalides dans le modèle féminin');
    referenced[a]=referenced[b]=referenced[c]=1;
    union(a,b);union(a,c);
  }
  const groups=new Map();
  for(let i=0;i<n;i++){
    if(!referenced[i])continue;
    const key=find(i),x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    if(![x,y,z].every(Number.isFinite))throw new Error('Positions 3D non finies');
    let group=groups.get(key);
    if(!group){
      group={vertices:[],minX:Infinity,maxX:-Infinity,
        minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
      groups.set(key,group);
    }
    group.vertices.push(i);
    group.minX=Math.min(group.minX,x);group.maxX=Math.max(group.maxX,x);
    group.minY=Math.min(group.minY,y);group.maxY=Math.max(group.maxY,y);
    group.minZ=Math.min(group.minZ,z);group.maxZ=Math.max(group.maxZ,z);
  }
  return [...groups.values()];
}

export function femaleComponentsToRemove(groups,box){
  const sx=box.max.x-box.min.x,sy=box.max.y-box.min.y,sz=box.max.z-box.min.z;
  if(!Number.isFinite(sx)||!Number.isFinite(sy)||!Number.isFinite(sz)||Math.min(sx,sy,sz)<=0)
    throw new Error('Dimensions Genesis invalides');
  const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
  const male=[],rig=[],hair=[],eye=[];
  for(const group of groups){
    const n=group.vertices.length;
    const cy=((group.minY+group.maxY)/2-box.min.y)/sy;
    const dx=((group.minX+group.maxX)/2)-cx;
    const w=group.maxX-group.minX,h=group.maxY-group.minY;
    // Exactement les critères documentés par le moteur Genesis (composants
    // pelviens masculins détachés du même GLB MakeHuman).
    if(n>=20&&n<=180&&cy>=.43&&cy<=.50&&
       Math.abs(dx)<=sx*.055&&w<=sx*.085&&h<=sy*.075&&group.maxZ-cz>=-sz*.03){
      male.push(group);continue;
    }
    if([4,7,14].includes(n)){rig.push(group);continue;}
    if([18,32].includes(n)&&group.minY>1&&group.maxY>1.6){hair.push(group);continue;}
    const mx=(group.minX+group.maxX)/2;
    if(n===40&&group.minY>1.50&&group.maxY<1.54&&
       group.minZ>.09&&group.maxZ<.14&&Math.abs(mx)<.05){eye.push(group);continue;}
  }
  return {male,rig,hair,eye};
}

export function cleanGenesisFemaleAnatomy(root){
  if(!root?.traverse)throw new Error('Scène humaine absente');
  let cleaned=0,removedTriangles=0,removedVertices=0;
  let removedMaleComponents=0,removedGuides=0;
  root.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||!mesh.geometry?.index||!mesh.geometry?.attributes?.position)return;
    const g=mesh.geometry,pos=g.attributes.position;
    if(pos.count!==KNOWN_VERTICES || g.userData?.julieFemaleTopologyCleaned)return;
    if(!g.userData?.julieConstructionHelpersRemoved)
      throw new Error('Le nettoyage de base Genesis est requis avant le modèle féminin');
    if(!g.boundingBox)g.computeBoundingBox?.();
    if(!g.boundingBox)throw new Error('Limites anatomiques inconnues');
    const groups=connectedComponents(g);
    const types=femaleComponentsToRemove(groups,g.boundingBox);
    // Genesis connaît quatre composants masculins distincts dans cette base.
    if(types.male.length!==4)
      throw new Error('Les quatre composants masculins Genesis ne sont pas identifiés : corps conservé');
    const discard=new Uint8Array(pos.count);
    const selection=[...types.male,...types.rig,...types.hair,...types.eye];
    for(const component of selection)for(const i of component.vertices)discard[i]=1;
    const oldIndex=g.index,oldGroups=g.groups?.length?
      g.groups:[{start:0,count:oldIndex.count,materialIndex:0}];
    const keep=[],nextGroups=[];
    for(const part of oldGroups){
      const start=keep.length,end=Math.min(oldIndex.count,part.start+part.count);
      for(let k=part.start;k+2<end;k+=3){
        const a=oldIndex.getX(k),b=oldIndex.getX(k+1),c=oldIndex.getX(k+2);
        if(discard[a]||discard[b]||discard[c])continue;
        keep.push(a,b,c);
      }
      if(keep.length>start)nextGroups.push({start,count:keep.length-start,materialIndex:part.materialIndex});
    }
    if(keep.length<3000||keep.length>=oldIndex.count||keep.length%3!==0)
      throw new Error('Aucune sélection sûre pour le modèle féminin');
    g.setIndex(keep);
    g.clearGroups();for(const part of nextGroups)g.addGroup(part.start,part.count,part.materialIndex);
    g.userData={...g.userData,julieFemaleTopologyCleaned:true};
    cleaned++;
    removedTriangles+=(oldIndex.count-keep.length)/3;
    removedMaleComponents+=types.male.length;
    removedGuides+=types.rig.length+types.hair.length+types.eye.length;
    removedVertices+=selection.reduce((total,x)=>total+x.vertices.length,0);
  });
  if(!cleaned)throw new Error('Maillage féminin Genesis attendu introuvable');
  return {cleanedMeshes:cleaned,malePartsRemoved:removedMaleComponents,
    technicalGuidesRemoved:removedGuides,removedVertices,removedTriangles};
}
