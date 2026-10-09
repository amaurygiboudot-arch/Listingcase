import * as THREE from 'three';

const JULIE_ID = 'JULIE_001';
const APP_VERSION = '0.1.0';
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

// Scène 3D entièrement locale. Aucun modèle téléchargé à l'exécution.
let renderer,scene,camera,avatar,head,eyes=[],leftArm,rightArm,torso,outfits=[];
let spin=false,waveStart=0,angular=0,orbitY=0,zoom=3.95,ptr=null,last=performance.now(),accum=0;
const rgba=(hex)=>new THREE.Color(hex);
const skin=new THREE.MeshStandardMaterial({color:rgba('#eac1a9'),roughness:.72,metalness:0});
const skinShade=new THREE.MeshStandardMaterial({color:rgba('#d6a48f'),roughness:.80});
const lipmat=new THREE.MeshStandardMaterial({color:rgba('#bf6479'),roughness:.58});
const hairmat=new THREE.MeshStandardMaterial({color:rgba('#d9ba72'),roughness:.68,metalness:.04});
const shadowHair=new THREE.MeshStandardMaterial({color:rgba('#a99151'),roughness:.75});
const eyeWhite=new THREE.MeshStandardMaterial({color:0xf2eee7,roughness:.3});
const greenEyes=new THREE.MeshStandardMaterial({color:0x437b5e,roughness:.35});
const pupil=new THREE.MeshStandardMaterial({color:0x172923,roughness:.32});
const lashes=new THREE.MeshStandardMaterial({color:0x503d30,roughness:.85});
const shoeMat=new THREE.MeshStandardMaterial({color:0x3b2c30,roughness:.66});
const accentMaterials=['#9b4561','#344f48','#343d65'].map(x=>new THREE.MeshStandardMaterial({color:rgba(x),roughness:.82,side:THREE.DoubleSide}));
let outfitIdx=0,drawOk=false;
function mesh(geo,mat,parent,x=0,y=0,z=0,scale=null){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);if(scale)o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function ell(parent,mat,x,y,z,a,b,c){return mesh(new THREE.SphereGeometry(1,24,16),mat,parent,x,y,z,[a,b,c])}
function cyl(parent,mat,x,y,z,ra,rb,h,rotZ=0){const obj=mesh(new THREE.CylinderGeometry(ra,rb,h,20),mat,parent,x,y,z);obj.rotation.z=rotZ;return obj}
function connect(parent,mat,a,b,r){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);const d=vb.clone().sub(va);const o=mesh(new THREE.CylinderGeometry(r*.9,r,d.length(),12),mat,parent,...va.clone().add(vb).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
function strand(points,r,material,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,20,r,6,false),material,parent)}

function buildAvatar(){
  avatar=new THREE.Group();scene.add(avatar);avatar.position.set(0,0,0.22);
  // Chaussures et jambes : silhouette adulte stylisée.
  for(const s of [-1,1]){
    const x=s*.103;
    ell(avatar,shoeMat,x,.065,.065,.095,.075,.158);
    connect(avatar,skin,[x,.14,0],[x*1.08,.42,0],.069);
    ell(avatar,skin,x*.98,.44,0,.075,.10,.077);
    connect(avatar,skin,[x*.98,.47,0],[s*.12,.78,0],.088);
  }
  const hip=ell(avatar,accentMaterials[0],0,.85,0,.22,.19,.13);outfits.push(hip);
  const skirt=cyl(avatar,accentMaterials[0],0,.72,0,.15,.26,.43);outfits.push(skirt);
  outfits.push(ell(avatar,accentMaterials[0],0,.55,0,.255,.045,.17));
  torso=new THREE.Group();torso.position.y=1.09;avatar.add(torso);
  const chest=ell(torso,accentMaterials[0],0,.095,0,.18,.29,.112);outfits.push(chest);
  const waist=cyl(torso,accentMaterials[0],0,-.06,0,.15,.13,.28);outfits.push(waist);
  for(const s of [-1,1]){
    outfits.push(ell(torso,accentMaterials[0],s*.095,.13,.07,.095,.115,.095));
    const shoulder=ell(avatar,skin,s*.205,1.3,0,.075,.076,.072);
    const arm=new THREE.Group();arm.position.set(s*.205,1.28,0);avatar.add(arm);
    connect(arm,skin,[0,0,0],[s*.06,-.27,.028],.061);
    ell(arm,skin,s*.06,-.27,.028,.056,.06,.055);
    connect(arm,skin,[s*.06,-.27,.028],[s*.06,-.48,.097],.049);
    ell(arm,skin,s*.055,-.52,.104,.050,.075,.040);
    for(let i=0;i<4;i++)connect(arm,skin,[s*(.02+i*.026),-.555,.112],[s*(.02+i*.025),-.607,.132],.009);
    if(s===-1)leftArm=arm;else rightArm=arm;
  }
  cyl(avatar,skin,0,1.39,0,.061,.072,.12);
  head=new THREE.Group();head.position.set(0,1.59,0);avatar.add(head);
  ell(head,skin,0,0,0,.153,.19,.135);
  // Oreilles et nez.
  ell(head,skinShade,-.149,-.022,-.006,.035,.065,.030);
  ell(head,skinShade,.149,-.022,-.006,.035,.065,.030);
  ell(head,skin,0,-.034,.135,.032,.048,.047);
  ell(head,lipmat,0,-.096,.120,.068,.016,.018);
  ell(head,skinShade,-.074,-.065,.111,.042,.017,.006);
  ell(head,skinShade,.074,-.065,.111,.042,.017,.006);
  for(const s of [-1,1]){
    const x=s*.067;
    const eyeGroup=new THREE.Group();eyeGroup.position.set(x,.018,.112);head.add(eyeGroup);
    ell(eyeGroup,eyeWhite,0,0,.005,.037,.024,.016);
    ell(eyeGroup,greenEyes,0,0,.018,.019,.022,.008);
    ell(eyeGroup,pupil,0,0,.025,.009,.012,.005);
    const brow=ell(head,lashes,x,.079,.122,.047,.008,.008);brow.rotation.z=-s*.12;
    eyes.push(eyeGroup);
  }
  // Cheveux blonds mi-longs : bonnet, raie et mèches tombant jusqu'aux épaules.
  ell(head,hairmat,0,.087,-.016,.158,.132,.143);
  ell(head,hairmat,-.12,-.01,-.005,.057,.16,.138);
  ell(head,hairmat,.12,-.01,-.005,.057,.16,.138);
  for(const s of [-1,1]){
    for(let i=0;i<7;i++){
      const t=i/6;
      let x=s*(.11+.02*Math.cos(t*Math.PI));
      strand([[x,.135,-.05+t*.07],[x*1.23,.035,-.015+t*.08],[x*1.13,-.14,-.015+t*.07],[x*1.35,-.32,.00+t*.06]], .011+(i%3)*.002, i%3===0?shadowHair:hairmat,head);
    }
  }
  // Frange balayée, regard dégagé.
  for(let i=0;i<6;i++){
    let x=-.13+i*.035;
    strand([[x,.168,.012],[x+.020,.131,.088],[x+.026,.084,.119]],.013,hairmat,head);
  }
  const jewel=new THREE.MeshStandardMaterial({color:0xc7ac80,metalness:.65,roughness:.3});
  ell(avatar,jewel,0,1.34,.081,.018,.023,.006);
}
function buildRoom(){
  const floorMat=new THREE.MeshStandardMaterial({color:0x4c3941,roughness:.89});
  const wallMat=new THREE.MeshStandardMaterial({color:0x77707a,roughness:.93,side:THREE.DoubleSide});
  mesh(new THREE.PlaneGeometry(9,9),floorMat,scene,0,-.015,0).rotation.x=-Math.PI/2;
  mesh(new THREE.PlaneGeometry(8,4.5),wallMat,scene,0,2,-2.4);
  const rugmat=new THREE.MeshStandardMaterial({color:0xa8939e,roughness:1});
  mesh(new THREE.CircleGeometry(1.65,60),rugmat,scene,0,.014,.3).rotation.x=-Math.PI/2;
  // Lit stylisé en arrière plan.
  const bed=new THREE.Group();bed.position.set(-1.48,0,-1.36);scene.add(bed);
  const wood=new THREE.MeshStandardMaterial({color:0x654f55,roughness:.85});
  mesh(new THREE.BoxGeometry(1.42,.3,.88),wood,bed,0,.34,0);
  mesh(new THREE.BoxGeometry(1.5,.7,.12),wood,bed,0,.63,-.45);
  const duvet=new THREE.MeshStandardMaterial({color:0xc4a8b0,roughness:.95});
  mesh(new THREE.BoxGeometry(1.35,.13,.78),duvet,bed,0,.55,.03);
  mesh(new THREE.BoxGeometry(.6,.13,.28),new THREE.MeshStandardMaterial({color:0xefddd7,roughness:.9}),bed,-.33,.64,-.24);
  // Lampe sur console à droite.
  const bedside=new THREE.Group();bedside.position.set(1.4,0,-1.25);scene.add(bedside);
  mesh(new THREE.BoxGeometry(.60,.48,.42),wood,bedside,0,.30,0);
  cyl(bedside,new THREE.MeshStandardMaterial({color:0xe5ba8f,emissive:0xe3aa72,emissiveIntensity:.23,roughness:.9}),0,.76,0,.12,.2,.27);
  cyl(bedside,wood,0,.58,0,.026,.026,.2);
  const bulb=new THREE.PointLight(0xffbf9d,12,3);bulb.position.set(1.4,.90,-1.25);scene.add(bulb);
  // Fenêtre et ciel.
  const pane=new THREE.MeshBasicMaterial({color:0x758ba9,side:THREE.DoubleSide});
  mesh(new THREE.PlaneGeometry(.9,1.25),pane,scene,1.52,2.28,-2.38);
  const frame=new THREE.MeshStandardMaterial({color:0xdbd2c8,roughness:.76});
  mesh(new THREE.BoxGeometry(1.01,.055,.05),frame,scene,1.52,2.91,-2.32);
  mesh(new THREE.BoxGeometry(1.01,.055,.05),frame,scene,1.52,1.65,-2.32);
  mesh(new THREE.BoxGeometry(.055,1.30,.05),frame,scene,1.02,2.27,-2.32);
  mesh(new THREE.BoxGeometry(.055,1.30,.05),frame,scene,2.02,2.27,-2.32);
  mesh(new THREE.BoxGeometry(.045,1.25,.055),frame,scene,1.52,2.27,-2.32);
  mesh(new THREE.BoxGeometry(.96,.04,.045),frame,scene,1.52,2.29,-2.32);
  // Tableau.
  mesh(new THREE.BoxGeometry(.75,.84,.06),wood,scene,-.45,2.13,-2.36);
  mesh(new THREE.BoxGeometry(.65,.74,.01),new THREE.MeshBasicMaterial({color:0xbba2a0}),scene,-.45,2.13,-2.315);
}
function initScene(){
  const canvas=$('#julie-3d');
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setClearColor(0x282632);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=false;
    scene=new THREE.Scene();scene.background=new THREE.Color(0x34313d);
    scene.fog=new THREE.Fog(0x34313d,5,9);
    camera=new THREE.PerspectiveCamera(39,1,.09,30);
    camera.position.set(0,1.48,zoom);camera.lookAt(0,1.0,0);
    scene.add(new THREE.HemisphereLight(0xc8d8ed,0x765966,2.15));
    const key=new THREE.DirectionalLight(0xffe0c7,2.8);key.position.set(-1,4,3);scene.add(key);
    const fill=new THREE.DirectionalLight(0xc5d0ed,1.3);fill.position.set(1,2,-1);scene.add(fill);
    buildRoom();buildAvatar();drawOk=true;onResize();
    canvas.addEventListener('pointerdown',e=>{ptr={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!ptr||ptr.id!==e.pointerId)return;angular+=(e.clientX-ptr.x)*.012;orbitY=THREE.MathUtils.clamp(orbitY+(e.clientY-ptr.y)*.004,-.3,.5);ptr.x=e.clientX;ptr.y=e.clientY;});
    canvas.addEventListener('pointerup',()=>{ptr=null});canvas.addEventListener('pointercancel',()=>{ptr=null});
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.004,2.6,5.0)},{passive:false});
    window.addEventListener('resize',onResize);
    requestAnimationFrame(tick);
  }catch(e){console.error('WebGL indisponible',e);$('#webgl-fallback').hidden=false;}
}
function qualityLimit(){return saved.quality==='eco'?30:saved.quality==='high'?120:60}
function onResize(){if(!renderer)return;const el=$('#julie-3d');const rect=el.getBoundingClientRect();if(rect.width<10||rect.height<10)return;const w=Math.floor(rect.width),h=Math.floor(rect.height);const dpr=Math.min(devicePixelRatio||1,saved.quality==='high'?2:saved.quality==='eco'?1:1.5);renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=h/w>1.1?46:37;camera.updateProjectionMatrix()}
function tick(now){requestAnimationFrame(tick);if(!renderer||!drawOk)return;let dt=Math.min(.06,(now-last)/1000);last=now;accum+=dt;const interval=1/qualityLimit();if(accum<interval)return;accum%=interval;const time=now*.001;
  if(spin)angular+=dt*.4;
  avatar.rotation.y=angular;
  avatar.rotation.z=Math.sin(time*.8)*.006;
  head.rotation.y=Math.sin(time*.45)*.07;
  head.rotation.z=Math.sin(time*.8)*.025;
  torso.scale.y=1+Math.sin(time*1.4)*.012;
  leftArm.rotation.z=.02+Math.sin(time*.8)*.015;
  rightArm.rotation.z=-.02-Math.sin(time*.8)*.015;
  if(now-waveStart<2400){const t=(now-waveStart)/1000;rightArm.rotation.z=1.95+Math.sin(t*9)*.18;rightArm.rotation.x=.2;}
  else rightArm.rotation.x=0;
  const blink=Math.pow(Math.max(0,Math.sin(time*1.55)),28);
  eyes.forEach(eye=>{eye.scale.y=1-.92*blink});
  camera.position.set(0,1.45+orbitY,zoom);camera.lookAt(0,1.0,0);
  renderer.render(scene,camera);
}
$('#btn-turn').addEventListener('click',()=>{spin=!spin;$('#btn-turn').style.color=spin?'#a9dfb7':'#fff'});
$('#btn-wave').addEventListener('click',()=>{waveStart=performance.now();$('#julie-line').textContent='« Coucou toi ! Tu m’as trouvée plutôt jolie dans cette première version ? 😉 »'});
$('#btn-outfit').addEventListener('click',()=>{
  outfitIdx=(outfitIdx+1)%accentMaterials.length;
  outfits.forEach(x=>x.material=accentMaterials[outfitIdx]);
  $('#julie-line').textContent=['« Cette couleur me va plutôt bien, non ? »','« J’avais envie de quelque chose de différent aujourd’hui. »','« Changement de style ! Tu en penses quoi ? »'][outfitIdx];
});
renderChat();initScene();
