/**
 * JULIE_001 : retire les coquilles techniques d'essayage présentes dans
 * le même GLB MakeHuman/MPFB CC0 que Genesis (topologie version 1).
 *
 * Classification conservatrice d'après la version de référence de
 * Genesis human-body-morphology.mjs. Ces coquilles ressemblent à une jupe
 * de couleur peau mais ne font pas partie du corps humain.
 *
 * On supprime des TRIANGLES uniquement : les sommets, UV, morph targets,
 * poids d'os, skeleton et animations restent intacts.
 */
export const GENESIS_TOPOLOGY = Object.freeze({
  vertices:21833,indices:110916,fitShellComponents:4
});

function componentsForGeometry(position,index){
  const n=position.count;
  const parent=new Int32Array(n),rank=new Uint8Array(n);
  for(let i=0;i<n;i++)parent[i]=i;
  function find(i){
    let root=i;
    while(parent[root]!==root)root=parent[root];
    while(parent[i]!==i){const next=parent[i];parent[i]=root;i=next;}
    return root;
  }
  function union(a,b){
    let ra=find(a),rb=find(b);
    if(ra===rb)return;
    if(rank[ra]<rank[rb]){const v=ra;ra=rb;rb=v;}
    parent[rb]=ra;
    if(rank[ra]===rank[rb])rank[ra]++;
  }
  for(let k=0;k<index.count;k+=3){
    const a=index.getX(k),b=index.getX(k+1),c=index.getX(k+2);
    if(a>=n||b>=n||c>=n||a<0||b<0||c<0)
      throw new Error('Indices du maillage humain invalides');
    union(a,b);union(b,c);union(c,a);
  }
  const groups=new Map();
  for(let i=0;i<n;i++){
    const id=find(i);
    let g=groups.get(id);
    if(!g){g={vertices:[],minY:Infinity,maxY:-Infinity};groups.set(id,g);}
    const y=position.getY(i);
    if(!Number.isFinite(y))throw new Error('Maillage humain non fini');
    g.vertices.push(i);
    if(y<g.minY)g.minY=y;
    if(y>g.maxY)g.maxY=y;
  }
  return [...groups.values()];
}

/**
 * Empêcher toute tentative de découper l'anatomie d'un futur autre modèle.
 * Ce correctif vise UNIQUEMENT l'asset connu (21 833 sommets, 110 916 indices)
 * et 4 coquilles de gabarit exportées.
 */
export function stripGenesisConstructionHelpers(root){
  if(!root?.traverse)throw new Error('Scène Genesis absente');
  const result={cleanedMeshes:0,removedComponents:0,hiddenVertices:0,
    removedTriangles:0,source:'genesis-cc0-v1'};
  let matched=false;
  root.traverse(mesh=>{
    if(!mesh.isSkinnedMesh||!mesh.geometry?.attributes?.position||!mesh.geometry?.index)return;
    const g=mesh.geometry;
    if(g.userData?.julieConstructionHelpersRemoved){matched=true;return;}
    const p=g.attributes.position,idx=g.index;
    if(p.count!==GENESIS_TOPOLOGY.vertices||idx.count!==GENESIS_TOPOLOGY.indices)return;
    matched=true;
    const helpers=componentsForGeometry(p,idx).filter(group=>
      (group.vertices.length===2392&&group.minY>.10&&group.maxY<1.45)||
      (group.vertices.length===740&&group.minY>.12&&group.maxY<.98)||
      (group.vertices.length===235&&group.maxY<.13)
    );
    if(helpers.length!==GENESIS_TOPOLOGY.fitShellComponents)
      throw new Error('Gabarits vestimentaires inconnus : nettoyage bloqué pour protéger le corps');
    const discard=new Uint8Array(p.count);
    for(const group of helpers)for(const id of group.vertices)discard[id]=1;
    const original=idx.count,sourceGroups=g.groups?.length
      ?g.groups:[{start:0,count:original,materialIndex:0}];
    const newIndices=[],newGroups=[];
    for(const group of sourceGroups){
      const start=newIndices.length,end=Math.min(original,group.start+group.count);
      for(let k=group.start;k+2<end;k+=3){
        const a=idx.getX(k),b=idx.getX(k+1),c=idx.getX(k+2);
        if(discard[a]||discard[b]||discard[c])continue;
        newIndices.push(a,b,c);
      }
      if(newIndices.length>start)
        newGroups.push({start,count:newIndices.length-start,materialIndex:group.materialIndex});
    }
    if(newIndices.length===0||newIndices.length>=original||newIndices.length%3!==0)
      throw new Error('Nettoyage non conforme : anatomie préservée sans changement');
    g.setIndex(newIndices);
    g.clearGroups();
    for(const group of newGroups)g.addGroup(group.start,group.count,group.materialIndex);
    const hiddenVertices=helpers.reduce((sum,group)=>sum+group.vertices.length,0);
    const removedTriangles=(original-newIndices.length)/3;
    g.userData={...g.userData,julieConstructionHelpersRemoved:true,
      julieConstructionRemoval:{components:helpers.length,hiddenVertices,removedTriangles}};
    result.cleanedMeshes++;
    result.removedComponents+=helpers.length;
    result.hiddenVertices+=hiddenVertices;
    result.removedTriangles+=removedTriangles;
  });
  if(!matched||!result.cleanedMeshes)
    throw new Error('Topologie Genesis attendue introuvable : corps original conservé');
  return result;
}
