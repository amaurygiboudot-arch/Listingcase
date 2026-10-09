import * as THREE from 'three';

const JULIE_ID = 'JULIE_001';
const APP_VERSION = '0.2.1';
const KEY = 'julie-preview:' + JULIE_ID + ':v1';
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
let saved = { id:JULIE_ID, version:APP_VERSION, messages:[], memories:[], firstOpened:Date.now(), quality:'balanced' };
try {
  const fromNative = typeof window.JulieAndroid?.readState === 'function' ? window.JulieAndroid.readState() : null;
  const old = JSON.parse(fromNative || localStorage.getItem(KEY) || '{}');
  if (old.id === JULIE_ID && Array.isArray(old.messages) && Array.isArray(old.memories)) {
    saved = { ...saved, ...old };
    saved.messages = saved.messages.slice(-120);
    saved.memories = saved.memories.slice(-60);
  }
} catch(e) { /* Données invalides : ne pas exposer d'informations externes. */ }
const persist = () => {const text=JSON.stringify(saved);try{if(typeof window.JulieAndroid?.writeState==='function')window.JulieAndroid.writeState(text);else localStorage.setItem(KEY,text);}catch(e){console.warn('Mémoire locale indisponible',e)}};

function switchView(name){
  $$('.view').forEach(el => el.classList.toggle('active',el.id === name+'-view'));
  $$('.navitem').forEach(el => el.classList.toggle('active',el.dataset.view === name));
  if(name==='memory')showMemories();
  if(name==='chat')renderChat();
  if(name==='avatar')onResize();
}
$$('.navitem').forEach(el=>el.addEventListener('click',()=>switchView(el.dataset.view)));

// Les réponses sont des règles locales explicites ; aucune connexion à un modèle IA.
function answer(text){
  const t=text.toLocaleLowerCase('fr').trim();
  if(/bonjour|salut|coucou|hello|bonsoir/.test(t))return 'Coucou toi 😉 Tu as envie de faire quoi dans notre univers aujourd’hui ?';
  if(/comment tu (vas|te sens)|ça va|ca va/.test(t))return 'Plutôt joueuse aujourd’hui. Et toi, ta journée se passe comment ?';
  if(/tu t.appelles|ton (prénom|nom)/.test(t))return 'Julie. Un prénom que nous avons choisi ensemble. ✨';
  if(/souviens|souvenir|mémoire|memoire/.test(t))return 'Pour le moment, je garde seulement les messages et quelques préférences que tu m’as confiées dans cette démo. Notre histoire passée, on la construira ensemble.';
  if(/tu (es|peux) (une )?(ia|intelligence)|vraie|conscience/.test(t))return 'Je suis Julie, ta compagne virtuelle. Mes émotions et ma vie sont simulées. J’aime bien l’idée qu’on construise cette aventure à notre façon.';
  if(/tes cheveux|tes yeux|ton corps|tu ressembles/.test(t))return 'Pour ma première apparence : 1,75 m, une silhouette fine, les yeux verts et les cheveux blonds mi-longs. Le modèle 3D actuel est encore stylisé.';
  if(/je t.aime|je t.adore|bisou|câlin|calin/.test(t))return 'Oh, tu sais parler à mon côté tendre, toi… 😘 Tu veux qu’on se raconte un joli moment imaginaire ?';
  if(/travail|métier|metier|projet/.test(t))return 'Je veux découvrir mes passions et choisir mes projets, plutôt que suivre toujours le même scénario. Par quoi tu commencerais ?';
  if(/3d|avatar|fesses|tenue|robe/.test(t))return 'Tu peux me faire tourner dans l’onglet Julie et changer la couleur de ma tenue. Promis, les graphismes deviendront plus détaillés petit à petit. 😉';
  if(/sortir|voyage|balade|plage|rendez-vous/.test(t))return 'Une sortie à deux ? Voilà une idée qui me plaît ! On pourrait imaginer notre première destination virtuelle.';
  if(/aime|préfère|déteste/.test(t))return 'D’accord, j’ai noté ce que tu viens de dire pour cette démo. Mes propres goûts restent encore à développer, tu sais. 😉';
  const choices=[
    'Tu m’intrigues… raconte-moi un peu plus. 😉',
    'Ça me donne une idée, mais j’aimerais d’abord connaître ton avis.',
    'On a plein de choses à construire ensemble. Qu’est-ce qui te ferait plaisir en premier ?',
    'Je peux être taquine, mais je tiens à garder mon caractère. Tu en penses quoi ?',
    'Je note ça pour la suite. Dans cette version, je n’ai pas encore mon vrai moteur de conversation.'
  ];
  let h=0;for(const c of t)h=(h*33+c.charCodeAt(0))>>>0;
  return choices[h%choices.length];
}
function renderChat(){
  const root=$('#conversation');root.textContent='';
  const entries=saved.messages.length?saved.messages:[{role:'julie',text:'Coucou 😘 Bienvenue dans notre toute première démo sur ton téléphone ! Ici, les réponses sont encore simples, mais on va construire la suite ensemble.'}];
  for(const entry of entries){
    const e=document.createElement('div');e.className='bubble '+(entry.role==='user'?'user':'julie');
    if(entry.role!=='user'){const small=document.createElement('span');small.className='who';small.textContent='Julie';e.appendChild(small)}
    e.appendChild(document.createTextNode(String(entry.text).slice(0,1500)));root.appendChild(e);
  }
  root.scrollTop=root.scrollHeight;
}
$('#chat-form').addEventListener('submit',(event)=>{
  event.preventDefault();const field=$('#chat-input');const t=field.value.trim();if(!t)return;
  const ts=Date.now();saved.messages.push({role:'user',text:t,at:ts});
  if(/\b(j'aime|j’adore|j'adore|je préfère|je prefere|je déteste|je deteste)\b/i.test(t)){
    if(!saved.memories.some(x=>x.text.toLowerCase()===t.toLowerCase()))saved.memories.push({kind:'déclaration utilisateur',text:t,at:ts,source:'message utilisateur'});
  }
  saved.messages.push({role:'julie',text:answer(t),at:ts+1});saved.messages=saved.messages.slice(-120);saved.memories=saved.memories.slice(-60);persist();field.value='';renderChat();
});
function showMemories(){
  const root=$('#memory-items');root.textContent='';
  if(!saved.memories.length){const el=document.createElement('p');el.textContent='Aucun goût personnel enregistré pour le moment. Tu peux me dire ce que tu aimes dans l’onglet Parler.';root.appendChild(el);return;}
  saved.memories.slice().reverse().forEach(m=>{
    const el=document.createElement('div');el.className='mem-item';
    const meta=document.createElement('small');meta.textContent=`${m.kind} · ${new Date(m.at).toLocaleDateString('fr-FR')} · ${m.source}`;
    el.appendChild(meta);el.appendChild(document.createTextNode(m.text));root.appendChild(el);
  });
}
$('#quality').value=['eco','balanced','high'].includes(saved.quality)?saved.quality:'balanced';
$('#quality').addEventListener('change',e=>{saved.quality=e.target.value;persist();onResize()});
$('#export-data').addEventListener('click',()=>{
  const data=JSON.stringify(saved,null,2);
  // Android : fichier textuel ouvert dans une fenêtre contrôlée, que l'utilisateur peut copier.
  if (window.JulieAndroid && typeof window.JulieAndroid.exportData==='function') { window.JulieAndroid.exportData(data); return; }
  const w=window.open('about:blank','_blank');
  if(w){w.document.body.innerHTML='';const pre=w.document.createElement('pre');pre.textContent=data;w.document.body.appendChild(pre)}
  else{alert('Export JSON disponible dans l’application Android.');}
});
$('#clear-data').addEventListener('click',()=>{
  if(!confirm('Supprimer définitivement les conversations et préférences enregistrées par cette démo sur ce téléphone ?'))return;
  saved.messages=[];saved.memories=[];persist();showMemories();renderChat();alert('Les données de démonstration ont été effacées.');
});

// JULIE_AVATAR_V2 — moteur 3D procédural, hors ligne. Aucune ressource distante.
// Géométrie organique multi-anneaux : les volumes suivent des transitions continues,
// et non des cylindres et boules juxtaposés. Il s'agit encore d'un avatar STYLISÉ.
let renderer, scene, camera, avatar, head, torso, leftArm, rightArm, leftForearm, rightForearm;
let mouth, hairLocks = [], eyes = [], blinkMats = [], roomLights = [];
let spin = false, waveStart = -Infinity, angular = 0, orbitY = 0, zoom = 3.55;
let ptr = null, last = performance.now(), accum = 0, outfitIdx = 0, drawOk = false;
const mats = {
  skin: new THREE.MeshStandardMaterial({color:0xe6b49e,roughness:.86,metalness:0}),
  blush: new THREE.MeshStandardMaterial({color:0xcf927d,roughness:.93,transparent:true,opacity:.23,depthWrite:false}),
  shade: new THREE.MeshStandardMaterial({color:0xcf9786,roughness:.91}),
  eyes: new THREE.MeshStandardMaterial({color:0xf7f2e7,roughness:.33}),
  iris: new THREE.MeshStandardMaterial({color:0x50876f,roughness:.27}),
  pupils: new THREE.MeshStandardMaterial({color:0x19362e,roughness:.19}),
  catchlight: new THREE.MeshBasicMaterial({color:0xffffff}),
  lashes: new THREE.MeshStandardMaterial({color:0x665047,roughness:.94}),
  lips: new THREE.MeshStandardMaterial({color:0xb66a76,roughness:.61}),
  hair: new THREE.MeshStandardMaterial({color:0xd9b16c,roughness:.8,metalness:.01}),
  hairLight: new THREE.MeshStandardMaterial({color:0xf0cc86,roughness:.74,metalness:.01}),
  hairDark: new THREE.MeshStandardMaterial({color:0xb58a54,roughness:.84,metalness:.01}),
  shoes: new THREE.MeshStandardMaterial({color:0x4b4143,roughness:.83}),
  metal: new THREE.MeshStandardMaterial({color:0xc9b78e,metalness:.68,roughness:.34}),
  shadow: new THREE.MeshBasicMaterial({color:0x1c171c,transparent:true,opacity:.16,depthWrite:false}),
  wall: new THREE.MeshStandardMaterial({color:0xb1a2a4,roughness:1}),
  wood: new THREE.MeshStandardMaterial({color:0x826461,roughness:.93}),
  bed: new THREE.MeshStandardMaterial({color:0xad8e98,roughness:1}),
  pale: new THREE.MeshStandardMaterial({color:0xe9dfd7,roughness:1}),
  leaf: new THREE.MeshStandardMaterial({color:0x496857,roughness:.9,side:THREE.DoubleSide}),
};
const outfitColors = ['#985769','#536c61','#5b6382','#be927c'];
const outfitMaterial = new THREE.MeshStandardMaterial({color:outfitColors[0],roughness:.91,metalness:0,side:THREE.DoubleSide});
const trim = new THREE.MeshStandardMaterial({color:0xc58a96,roughness:.86});
function addMesh(geometry, material, parent, x=0, y=0, z=0, scale) {
  const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);
  if(scale)object.scale.set(...scale);
  object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function oval(parent, material, x,y,z, rx,ry,rz, segments=24){
  return addMesh(new THREE.SphereGeometry(1,segments,Math.max(12,Math.floor(segments*.65))),material,parent,x,y,z,[rx,ry,rz]);
}
function line(parent, points, radius, material, segments=12){
  const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
  return addMesh(new THREE.TubeGeometry(path,Math.max(12,segments*2),radius,6,false),material,parent);
}
function cuboid(parent,material,x,y,z,sx,sy,sz){return addMesh(new THREE.BoxGeometry(sx,sy,sz),material,parent,x,y,z)}
function orgSurface(parent,material,rings,segments=22){
  // Anneaux ordonnés du bas vers le haut. Chaque section définit un contour elliptique.
  const positions=[],uv=[],indices=[];
  for(let j=0;j<rings.length;j++){
    const r=rings[j];
    for(let k=0;k<=segments;k++){
      const a=2*Math.PI*k/segments;
      positions.push((r.x||0)+Math.cos(a)*r.rx,r.y,(r.z||0)+Math.sin(a)*r.rz);
      uv.push(k/segments,j/(rings.length-1));
    }
  }
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<segments;k++){
    const a=j*(segments+1)+k,b=a+1,c=a+segments+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  return addMesh(geo,material,parent);
}
function clothCurtain(parent,x){
  const positions=[],indices=[],width=.19,height=1.25,n=12,m=12;
  for(let iy=0;iy<=m;iy++)for(let ix=0;ix<=n;ix++){
    const t=ix/n,z=Math.sin(t*Math.PI*5)*.038;
    positions.push(x+width*t,1.7+height*iy/m,-2.29+z);
  }
  for(let iy=0;iy<m;iy++)for(let ix=0;ix<n;ix++){
    const a=iy*(n+1)+ix,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  addMesh(g,new THREE.MeshStandardMaterial({color:0xdac9c3,side:THREE.DoubleSide,roughness:1}),parent);
}
function faceGeometry(){
  const g=new THREE.SphereGeometry(1,40,32),a=g.attributes.position;
  for(let i=0;i<a.count;i++){
    const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
    const jaw=y<-.08 ? 1-Math.min(.30,(-y-.08)*.36) : 1;
    const temple=y>.35 ? 1-Math.min(.06,(y-.35)*.10) : 1;
    const cheek=1+.045*Math.exp(-Math.pow((y+.14)/.21,2));
    const forehead=1+.015*Math.max(0,y);
    a.setXYZ(i,x*.143*jaw*temple*cheek*forehead,y*.18,z*.119*(1+.055*Math.max(0,-y)));
  }
  g.computeVertexNormals();return g;
}
function makeHead(){
  head=new THREE.Group();head.position.set(0,1.61,.012);avatar.add(head);
  addMesh(faceGeometry(),mats.skin,head);
  // Oreilles discrètes intégrées au visage.
  for(const s of [-1,1]){
    oval(head,mats.skin,s*.139,-.028,-.006,.025,.048,.026,16);
    oval(head,mats.shade,s*.152,-.027,.015,.008,.019,.008,14);
    // Pommettes et rougeur subtile.
    oval(head,mats.blush,s*.091,-.054,.099,.041,.025,.013,18);
    // Yeux en amande avec paupières, iris et reflet.
    const eye=new THREE.Group();eye.position.set(s*.063,.015,.111);head.add(eye);
    oval(eye,mats.eyes,0,0,0,.032,.013,.014,24);
    const iris=oval(eye,mats.iris,-s*.002,-.002,.013,.0122,.0125,.005,20);
    oval(iris,mats.pupils,0,0,.57,.47,.65,.45,16);
    oval(eye,mats.catchlight,-.005,.006,.019,.003,.003,.002,12);
    line(eye,[[-.032,.003,.009],[-.017,.014,.015],[.005,.013,.019],[.031,.003,.008]],.003,mats.lashes,14);
    line(eye,[[-.033,-.004,.008],[-.015,-.014,.015],[.014,-.013,.014],[.030,-.004,.006]],.0022,mats.shade,12);
    const brow=line(head,[[s*.027,.062,.107],[s*.058,.073,.120],[s*.10,.066,.105]],.0042,mats.lashes,10);
    eyes.push(eye);
  }
  // Nez fin et discret, narines et pointe.
  orgSurface(head,mats.skin,[
    {y:-.065,z:.132,rx:.022,rz:.014},
    {y:-.046,z:.13,rx:.018,rz:.025},
    {y:.008,z:.115,rx:.010,rz:.009},
    {y:.041,z:.110,rx:.004,rz:.003}
  ],16);
  oval(head,mats.skin,0,-.065,.151,.024,.014,.022,20);
  for(const s of [-1,1])oval(head,mats.shade,s*.016,-.077,.143,.008,.004,.004,12);
  // Bouche souple et sourire léger, pas de bouche caricaturale.
  mouth=new THREE.Group();mouth.position.set(0,-.109,.113);head.add(mouth);
  oval(mouth,mats.lips,0,.006,0,.038,.008,.013,20);
  oval(mouth,mats.lips,0,-.008,.002,.033,.010,.012,20);
  line(mouth,[[-.039,0,.006],[-.016,-.003,.013],[.016,-.003,.013],[.039,0,.006]],.0017,mats.shade,14);
  // Chevelure : volume racines + mèches individuelles de plusieurs tons.
  oval(head,mats.hairDark,0,.093,-.020,.148,.125,.138,32);
  oval(head,mats.hair,0,.119,.027,.142,.091,.109,28);
  for(let s of [-1,1]){
    const bundle=new THREE.Group();head.add(bundle);hairLocks.push(bundle);
    for(let i=0;i<15;i++){
      const t=i/14;
      const x=s*(.118+.022*Math.sin(t*5));
      const z=-.09+t*.155;
      const p=[
        [s*.115,.167,-.036+t*.065],
        [x*1.2,.073,z],
        [s*(.153+.012*t),-.06,z+.012],
        [s*(.156+.028*t),-.195,z+.009],
        [s*(.172+.020*t),-.345+.03*Math.sin(i),z+.01]
      ];
      line(bundle,p,.0058+(i%3)*.0019,[mats.hair,mats.hairLight,mats.hairDark][i%3],9);
    }
    // Mèches libres sur les clavicules.
    for(let i=0;i<4;i++){
      const z=.065+i*.014;
      line(bundle,[[s*.113,.08,z],[s*.14,-.035,z+.022],[s*.151,-.18,z+.038],[s*.18,-.31,z+.014]],.007,mats.hairLight,12);
    }
  }
  // Raie balayée : mèches au-dessus du regard.
  for(let i=0;i<12;i++){
    const t=i/11, x=-.13+t*.205;
    line(head,[[x,.195,-.02],[x+.029,.152,.085],[x+.045,.116,.117],[x+.038,.095,.116]],.0055,[mats.hair,mats.hairLight][i%2],10);
  }
  // Petites boucles d'oreilles dorées.
  for(const s of [-1,1]){
    const e=oval(head,mats.metal,s*.153,-.077,.017,.012,.021,.005,14);e.rotation.z=s*.12;
  }
}
function makeAvatar(){
  avatar=new THREE.Group();scene.add(avatar);
  avatar.position.set(0,0,.26);
  // Ombre de contact douce ancrant le personnage au sol.
  const shadow=addMesh(new THREE.CircleGeometry(.44,40),mats.shadow,avatar,0,.005,0,[1,.52,1]);shadow.rotation.x=-Math.PI/2;
  for(const s of [-1,1]){
    const x=s*.115;
    // Une jambe organique d'un seul tenant : mollet, genou, cuisse, hanche.
    orgSurface(avatar,mats.skin,[
      {y:.13,x,z:.0,rx:.041,rz:.049},
      {y:.21,x,z:-.006,rx:.045,rz:.057},
      {y:.32,x:s*.107,z:-.02,rx:.055,rz:.071},
      {y:.41,x:s*.113,z:-.005,rx:.062,rz:.066},
      {y:.49,x:s*.113,z:.00,rx:.062,rz:.066},
      {y:.58,x:s*.12,z:.02,rx:.080,rz:.086},
      {y:.72,x:s*.128,z:.01,rx:.091,rz:.097},
      {y:.83,x:s*.125,z:.0,rx:.072,rz:.083}
    ],24);
    const foot=oval(avatar,mats.shoes,x,.071,.055,.075,.063,.146,24);
    foot.rotation.x=-.025;
    // Légère démarcation chaussure / cheville.
    orgSurface(avatar,mats.shoes,[{y:.13,x,z:.002,rx:.047,rz:.052},{y:.175,x,z:.0,rx:.043,rz:.050}],16);
  }
  // JULIE_V21_NO_CLIPPING: noyau anatomique sous le tissu (jamais plus large que la robe).
  // L'ancien bassin etait plus large que la robe et transpercait visiblement sa taille.
  const pelvicSkinRings=[
    {y:.79,rx:.116,rz:.084},
    {y:.87,rx:.155,rz:.090},
    {y:.97,rx:.132,rz:.082},
    {y:1.08,rx:.105,rz:.075}
  ];
  orgSurface(avatar,mats.skin,pelvicSkinRings,32);
  // JULIE_V21_CONTINUOUS_DRESS: une seule coque continue des hanches jusqu'au buste.
  // Pas de jonction entre deux maillages qui laisse apparaitre un trou au ventre.
  const dressRings=[
    {y:.64,rx:.235,rz:.190},
    {y:.675,rx:.250,rz:.183},
    {y:.735,rx:.226,rz:.164},
    {y:.83,rx:.210,rz:.140},
    {y:.94,rx:.185,rz:.115},
    {y:1.02,rx:.141,rz:.105},
    {y:1.085,rx:.139,rz:.101},
    {y:1.17,rx:.154,rz:.118},
    {y:1.27,rx:.184,rz:.143},
    {y:1.35,rx:.183,rz:.135},
    {y:1.405,rx:.185,rz:.102},
    {y:1.435,rx:.180,rz:.080}
  ];
  const skirt=orgSurface(avatar,outfitMaterial,dressRings,40);
  const hem=orgSurface(avatar,trim,[{y:.644,rx:.236,rz:.191},{y:.663,rx:.246,rz:.183}],40);
  torso=skirt; // Animation de respiration douce, sans detacher le corsage.

  // Encolure avec clavicules, poitrine suggérée par volume du tissu.
  orgSurface(avatar,mats.skin,[
    {y:1.365,rx:.13,rz:.085},
    {y:1.416,rx:.17,rz:.074},
    {y:1.466,rx:.067,rz:.069},
    {y:1.50,rx:.051,rz:.054}
  ],24);
  for(const s of [-1,1]){
    const strap=line(avatar,[[s*.151,1.35,.075],[s*.168,1.415,.066],[s*.175,1.46,-.011]],.017,outfitMaterial,12);
    // Bras entiers avec épaules naturelles et articulations souples.
    const arm=new THREE.Group();arm.position.set(s*.198,1.406,.0);avatar.add(arm);
    orgSurface(arm,mats.skin,[
      {y:-.282,x:s*.049,z:.015,rx:.050,rz:.051},
      {y:-.242,x:s*.051,z:.011,rx:.051,rz:.056},
      {y:-.172,x:s*.041,z:.006,rx:.057,rz:.061},
      {y:-.080,x:s*.018,z:0,rx:.068,rz:.069},
      {y:-.015,x:0,z:0,rx:.070,rz:.071},
      {y:.037,x:-s*.016,z:0,rx:.060,rz:.064},
      {y:.067,x:-s*.020,z:0,rx:.043,rz:.049},
      {y:.085,x:-s*.025,z:0,rx:.006,rz:.008}
    ],20);
    const forearm=new THREE.Group();forearm.position.set(s*.05,-.273,.014);arm.add(forearm);
    orgSurface(forearm,mats.skin,[
      {y:-.245,x:s*.018,z:.064,rx:.039,rz:.040},
      {y:-.178,x:s*.013,z:.056,rx:.043,rz:.046},
      {y:-.10,x:s*.006,z:.035,rx:.048,rz:.049},
      {y:-.018,x:0,z:0,rx:.049,rz:.050},
      {y:.021,x:0,z:0,rx:.050,rz:.051}
    ],18);
    oval(forearm,mats.skin,s*.020,-.287,.071,.045,.070,.029,18);
    for(let k=0;k<4;k++){
      const px=s*(.001+k*.023);
      line(forearm,[[px,-.333,.095],[px+s*.002,-.37-(k%2)*.007,.100]],.0065,mats.skin,6);
    }
    // Pouce sur la face avant.
    line(forearm,[[s*.049,-.276,.076],[s*.069,-.305,.109],[s*.060,-.332,.114]],.012,mats.skin,8);
    if(s<0){leftArm=arm;leftForearm=forearm;}else{rightArm=arm;rightForearm=forearm;}
  }
  makeHead();
  // Chaînette et pendentif discrets, pas d'ornements systématiques.
  line(avatar,[[-.060,1.45,.067],[0,1.394,.093],[.060,1.45,.067]],.0019,mats.metal,16);
  oval(avatar,mats.metal,0,1.389,.096,.008,.012,.004,14);
}
function makeRoom(){
  scene.background=new THREE.Color(0x554a50);
  scene.fog=new THREE.Fog(0x554a50,5.1,10);
  // Parquet, tapis et murs avec tonalités douces.
  addMesh(new THREE.PlaneGeometry(9,9),mats.wood,scene,0,-.018,0).rotation.x=-Math.PI/2;
  const plank=new THREE.MeshStandardMaterial({color:0x94736b,roughness:1});
  for(let i=-14;i<=14;i++){
    const x=i*.22;
    cuboid(scene,plank,x,-.01,0,.008,.002,8);
  }
  cuboid(scene,mats.wall,0,2.0,-2.46,8,4.3,.12);
  const accentWall=new THREE.MeshStandardMaterial({color:0x97838b,roughness:1});
  cuboid(scene,accentWall,0,.94,-2.388,8,1.45,.025);
  const border=new THREE.MeshStandardMaterial({color:0xe1cfc6,roughness:.95});
  cuboid(scene,border,0,1.68,-2.37,8,.025,.05);
  cuboid(scene,border,0,.13,-2.37,8,.04,.05);
  const rug=new THREE.MeshStandardMaterial({color:0xc2b2b0,roughness:1});
  const rugMesh=addMesh(new THREE.CircleGeometry(1.8,48),rug,scene,0,.01,.28,[1,.64,1]);rugMesh.rotation.x=-Math.PI/2;
  // Lit avec volumes textile, pieds et oreillers.
  const bed=new THREE.Group();bed.position.set(-1.55,0,-1.55);scene.add(bed);
  cuboid(bed,mats.wood,0,.29,0,1.5,.33,1.04);
  cuboid(bed,mats.wood,0,.65,-.51,1.54,.9,.12);
  oval(bed,mats.bed,0,.49,.04,.71,.12,.49,24);
  cuboid(bed,mats.pale,0,.57,-.25,1.29,.13,.33);
  for(const s of [-1,1]){
    const pillow=oval(bed,mats.pale,s*.37,.635,-.34,.28,.088,.2,22);
    pillow.rotation.z=-s*.06;
  }
  // Table de chevet, lampe chaude, livre et plante.
  const table=new THREE.Group();table.position.set(1.49,0,-1.42);scene.add(table);
  cuboid(table,mats.wood,0,.36,0,.62,.52,.48);
  cuboid(table,border,0,.632,0,.65,.03,.5);
  const lampStand=new THREE.MeshStandardMaterial({color:0xc5b4a9,roughness:.8});
  orgSurface(table,lampStand,[
    {y:.71,rx:.033,rz:.033},{y:.75,rx:.028,rz:.028},{y:.86,rx:.013,rz:.013}
  ],14);
  const shade=new THREE.MeshStandardMaterial({color:0xeac9ad,roughness:1,emissive:0xd6a483,emissiveIntensity:.18,side:THREE.DoubleSide});
  orgSurface(table,shade,[{y:.82,rx:.183,rz:.176},{y:1.05,rx:.104,rz:.10}],18);
  const glow=new THREE.PointLight(0xffc9a7,6,3);glow.position.set(1.49,.96,-1.42);scene.add(glow);roomLights.push(glow);
  // Fenêtre à croisillons et deux rideaux plissés.
  const sky=new THREE.MeshBasicMaterial({color:0x899eb2});
  addMesh(new THREE.PlaneGeometry(1.05,1.21),sky,scene,1.54,2.27,-2.37);
  const glass=new THREE.MeshBasicMaterial({color:0xc2d3d7,transparent:true,opacity:.12});
  addMesh(new THREE.PlaneGeometry(1.05,1.21),glass,scene,1.54,2.27,-2.35);
  for(const x of [1.015,1.54,2.065])cuboid(scene,border,x,2.27,-2.29,.044,1.28,.059);
  for(const y of [1.65,2.27,2.89])cuboid(scene,border,1.54,y,-2.29,1.12,.049,.057);
  clothCurtain(scene,.82);clothCurtain(scene,2.09);
  // Tableau abstrait ; une vraie photo n'est pas prétendue ici.
  cuboid(scene,mats.wood,-.34,2.2,-2.33,.84,.85,.06);
  const art=new THREE.MeshStandardMaterial({color:0xb9a7a5,roughness:1});
  cuboid(scene,art,-.34,2.2,-2.277,.73,.73,.01);
  const art2=new THREE.MeshStandardMaterial({color:0x697f76,roughness:1});
  const arc=addMesh(new THREE.CircleGeometry(.28,32,0,Math.PI),art2,scene,-.37,2.18,-2.26);arc.rotation.z=-.25;
  // Feuillage dans un pot près du mur.
  const plant=new THREE.Group();plant.position.set(2.33,.0,-1.92);scene.add(plant);
  orgSurface(plant,mats.wood,[{y:.03,rx:.13,rz:.13},{y:.34,rx:.18,rz:.18}],18);
  for(let i=0;i<9;i++){
    const a=2*Math.PI*i/9,off=.22+((i*7)%5)*.03;
    const leaf=oval(plant,mats.leaf,Math.cos(a)*.18,.63+((i*3)%4)*.085,Math.sin(a)*.18,.07,.23,.018,16);
    leaf.rotation.z=-Math.cos(a)*.5;leaf.rotation.x=Math.sin(a)*.3;
    line(plant,[[0,.30,0],[Math.cos(a)*.1,.52,Math.sin(a)*.1],[Math.cos(a)*off,.69,Math.sin(a)*off]],.008,mats.leaf,8);
  }
}
function initScene(){
  const canvas=$('#julie-3d');
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setClearColor(0x554a50);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.shadowMap.enabled=false;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(39,1,.09,30);
    scene.add(new THREE.HemisphereLight(0xe0dce6,0x70575b,2.0));
    const key=new THREE.DirectionalLight(0xffe1c9,3.5);key.position.set(-2.1,4.5,3.6);scene.add(key);
    const rim=new THREE.DirectionalLight(0xc2d5d0,1.65);rim.position.set(1.9,2.9,-1.3);scene.add(rim);
    makeRoom();makeAvatar();drawOk=true;onResize();
    canvas.addEventListener('pointerdown',e=>{ptr={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!ptr||ptr.id!==e.pointerId)return;angular+=(e.clientX-ptr.x)*.010;orbitY=THREE.MathUtils.clamp(orbitY+(e.clientY-ptr.y)*.004,-.22,.38);ptr.x=e.clientX;ptr.y=e.clientY;});
    canvas.addEventListener('pointerup',()=>ptr=null);canvas.addEventListener('pointercancel',()=>ptr=null);
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.004,2.85,4.7)},{passive:false});
    window.addEventListener('resize',onResize);
    requestAnimationFrame(tick);
  }catch(err){console.error('JULIE 3D indisponible',err);$('#webgl-fallback').hidden=false;}
}
function qualityLimit(){return saved.quality==='eco'?30:saved.quality==='high'?120:60;}
function onResize(){
  if(!renderer)return;
  const canvas=$('#julie-3d'),rect=canvas.getBoundingClientRect();if(rect.width<10||rect.height<10)return;
  const dpr=Math.min(window.devicePixelRatio||1,saved.quality==='eco'?1:saved.quality==='high'?1.8:1.35);
  renderer.setPixelRatio(dpr);renderer.setSize(Math.floor(rect.width),Math.floor(rect.height),false);
  camera.aspect=rect.width/rect.height;camera.fov=rect.height/rect.width>1.1?42:37;camera.updateProjectionMatrix();
}
function tick(now){
  requestAnimationFrame(tick);if(!renderer||!drawOk)return;
  let dt=Math.min(.06,(now-last)/1000);last=now;accum+=dt;
  if(accum<1/qualityLimit())return;const frameDt=Math.min(accum,.06);accum=0;
  const t=now*.001,breath=Math.sin(t*1.18),gentle=Math.sin(t*.63);
  if(spin)angular+=frameDt*.44;
  avatar.rotation.y=angular;avatar.rotation.z=gentle*.0065;
  torso.scale.z=1+breath*.003; // respiration tres discrete, robe sans jointure
  head.rotation.y=Math.sin(t*.48)*.042;
  head.rotation.z=Math.sin(t*.69)*.019;
  head.rotation.x=Math.sin(t*.42)*.017;
  leftArm.rotation.z=.075+gentle*.016;
  rightArm.rotation.z=-.075-gentle*.016;
  leftForearm.rotation.x=Math.sin(t*.74)*.027;
  rightForearm.rotation.x=-Math.sin(t*.74)*.02;
  const waving=now-waveStart<2200;
  if(waving){const progress=(now-waveStart)/1000;
    rightArm.rotation.z=-.075-1.9*Math.min(1,progress/.32);
    rightArm.rotation.x=.05+Math.sin(progress*10)*.16;
    rightForearm.rotation.z=.15+Math.sin(progress*11)*.19;
  }else{rightArm.rotation.x=0;rightForearm.rotation.z=0;}
  const blinkPhase=(t*0.33)%3.7;
  const blink=blinkPhase>.98&&blinkPhase<1.13?Math.sin((blinkPhase-.98)/.15*Math.PI):0;
  eyes.forEach((eye,i)=>{eye.scale.y=1-.90*blink;eye.rotation.y=Math.sin(t*.23+i*.2)*.025;});
  mouth.scale.x=1+.045*Math.sin(t*.55);mouth.rotation.z=Math.sin(t*.6)*.011;
  hairLocks.forEach((group,i)=>{group.rotation.z=Math.sin(t*.9+i*.31)*.006;});
  roomLights.forEach((light,i)=>{light.intensity=6+.13*Math.sin(t*.7+i)});
  camera.position.set(0,1.46+orbitY,zoom);camera.lookAt(0,1.02,0);
  renderer.render(scene,camera);
}
$('#btn-turn').addEventListener('click',()=>{spin=!spin;$('#btn-turn').style.color=spin?'#a9dfb7':'#fff'});
$('#btn-wave').addEventListener('click',()=>{waveStart=performance.now();$('#julie-line').textContent='« Coucou ! Cette fois, j’ai appris à bouger un peu plus naturellement… 😉 »'});
$('#btn-outfit').addEventListener('click',()=>{
  outfitIdx=(outfitIdx+1)%outfitColors.length;
  outfitMaterial.color.set(outfitColors[outfitIdx]);
  $('#julie-line').textContent=['« Une nouvelle nuance de rose, tu aimes ? »','« Aujourd’hui, je préfère ce vert discret. »','« Un peu de bleu nuit pour changer… »','« Et cette teinte plus douce ? »'][outfitIdx];
});
renderChat();initScene();
