import * as THREE from 'three';

const JULIE_ID = 'JULIE_001';
const APP_VERSION = '0.3.0';
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
  if(/tes cheveux|tes yeux|ton corps|tu ressembles/.test(t))return 'Pour ma première apparence : 1,75 m, une silhouette fine, les yeux verts et les cheveux blonds mi-longs. Le modèle V3 est une base humaine réaliste en cours de personnalisation.';
  if(/je t.aime|je t.adore|bisou|câlin|calin/.test(t))return 'Oh, tu sais parler à mon côté tendre, toi… 😘 Tu veux qu’on se raconte un joli moment imaginaire ?';
  if(/travail|métier|metier|projet/.test(t))return 'Je veux découvrir mes passions et choisir mes projets, plutôt que suivre toujours le même scénario. Par quoi tu commencerais ?';
  if(/3d|avatar|fesses|tenue|robe/.test(t))return 'Tu peux me faire tourner dans l’onglet Julie. Ma base humaine 3D est chargée hors ligne et les vêtements personnalisés viendront ensuite. 😉';
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
  // Export JSON via le sélecteur de fichiers Android, sans transmission réseau.
  if (window.JulieAndroid && typeof window.JulieAndroid.exportData==='function') { window.JulieAndroid.exportData(data); return; }
  const w=window.open('about:blank','_blank');
  if(w){w.document.body.innerHTML='';const pre=w.document.createElement('pre');pre.textContent=data;w.document.body.appendChild(pre)}
  else{alert('Export JSON disponible dans l’application Android.');}
});
$('#clear-data').addEventListener('click',()=>{
  if(!confirm('Supprimer définitivement les conversations et préférences enregistrées par cette démo sur ce téléphone ?'))return;
  saved.messages=[];saved.memories=[];persist();showMemories();renderChat();alert('Les données de démonstration ont été effacées.');
});


// Import explicite des souvenirs de démonstration (V1/V2.1) après export JSON.
function importOlderMemories(raw){
  if(typeof raw!=='string'||raw.length>2000000)throw new Error('Fichier trop volumineux');
  const incoming=JSON.parse(raw);
  if(incoming?.id!==JULIE_ID || !Array.isArray(incoming.messages) || !Array.isArray(incoming.memories))
    throw new Error('Le fichier n’est pas un export Julie compatible');
  if(!confirm('Importer les conversations et préférences de cet ancien export Julie ? Les données actuelles seront conservées.'))return false;
  const knownMsg=new Set(saved.messages.map(x=>[x.role,x.at,x.text].join('|')));
  for(const m of incoming.messages.slice(-120)){
    if(!m||!['user','julie','partner'].includes(m.role)||typeof m.text!=='string')continue;
    const row={role:m.role==='partner'?'julie':m.role,at:Number(m.at)||Date.now(),text:m.text.slice(0,1500)};
    const k=[row.role,row.at,row.text].join('|');if(!knownMsg.has(k)){saved.messages.push(row);knownMsg.add(k);}
  }
  const knownMem=new Set(saved.memories.map(x=>[x.kind,x.at,x.text].join('|')));
  for(const m of incoming.memories.slice(-60)){
    if(!m||typeof m.text!=='string')continue;
    const row={kind:String(m.kind||'souvenir importé').slice(0,60),text:m.text.slice(0,1500),source:'export utilisateur',at:Number(m.at)||Date.now()};
    const k=[row.kind,row.at,row.text].join('|');if(!knownMem.has(k)){saved.memories.push(row);knownMem.add(k);}
  }
  saved.messages=saved.messages.sort((a,b)=>a.at-b.at).slice(-120);
  saved.memories=saved.memories.sort((a,b)=>a.at-b.at).slice(-60);
  persist();renderChat();showMemories();
  alert('Import terminé : les données existantes ont été conservées.');
  return true;
}
window.JulieReceiveImport=(raw)=>{
  try{importOlderMemories(raw)}catch(e){alert(e?.message||'Import impossible')}
};
$('#import-data')?.addEventListener('click',()=>{
  if(typeof window.JulieAndroid?.importData==='function')window.JulieAndroid.importData();
  else alert('L’import de souvenirs est disponible dans l’application Android.');
});

// JULIE_AVATAR_V3 — vrai modèle humain GLB, rig et texture CC0.
// Même maillage humain MakeHuman/MPFB CC0 que Genesis/Ève, avec morphologie féminine
// adaptée pour JULIE_001, embarqué dans l'APK pour fonctionner hors ligne.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fitHumanModel, clampFps, rendererDpr, isAuthorizedAssetUrl } from './avatar-utils.mjs';
import { adaptEveDerivedFemaleMesh, normalizeGenesisMaterials } from './eve-derived.mjs';

const MODEL_URL = './models/julie_genesis_human.glb';
const canvas = $('#julie-3d');
const assetStatus = $('#avatar-status');
let renderer = null;
let scene = null;
let camera = null;
let avatar = null;
let mixer = null;
let turnOn = false;
let angle = 0;
let tilt = 0;
let distance = 3.35;
let pointer = null;
let renderLast = 0;
let animationLast = 0;
let loadedHuman = false;
let orbitDirection = 1;
let modelStats = null;

function updateStatus(message) {
  if (assetStatus) assetStatus.textContent = message;
}
function material(color, roughness=0.92) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness:0});
}
function box(parent, mat, size, pos, rotation=[0,0,0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
  mesh.position.set(...pos);mesh.rotation.set(...rotation);
  mesh.receiveShadow = true;parent.add(mesh);return mesh;
}
function buildRoom(){
  const floor = material(0x8f7469), wall=material(0xe6d8d4), accent=material(0xc5a5a4);
  const white=material(0xf2e8e4), wood=material(0x8f6255), rose=material(0xb48191);
  const dark=material(0x423f4c), green=material(0x708979);
  box(scene,floor,[8,.12,8],[0,-.075,0]);
  box(scene,wall,[8,4,.11],[0,1.94,-2.0]);
  box(scene,accent,[.14,4,8],[-3.5,1.94,0]);
  box(scene,white,[8,.12,.14],[0,.10,-1.9]);
  // Lit et tables d'appoint, dimensions et orientation réalistes.
  box(scene,wood,[1.55,.65,2.1],[-2.0,.37,-.7]);
  box(scene,rose,[1.51,.16,1.96],[-2.0,.77,-.68]);
  box(scene,white,[1.22,.13,.58],[-2.0,.88,-1.25]);
  box(scene,white,[1.45,.075,1.06],[-2.0,.87,-.33]);
  box(scene,wood,[.78,.68,.62],[2.15,.35,-1.1]);
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.24,.30,.43,20),material(0xe9c6a0));
  lamp.position.set(2.15,.95,-1.13);scene.add(lamp);
  box(scene,wood,[.050,.35,.05],[2.15,.71,-1.1]);
  // Fenêtre. Pas de lumière brûlée : l'éclairage reste stable entre appareils.
  box(scene,material(0x92b2c5),[1.30,1.40,.04],[1.35,2.15,-1.85]);
  for(const dx of [-.66,.66])box(scene,white,[.08,1.5,.08],[1.35+dx,2.15,-1.77]);
  for(const dy of [-.72,.72])box(scene,white,[1.41,.08,.08],[1.35,2.15+dy,-1.77]);
  box(scene,white,[.07,1.46,.08],[1.35,2.15,-1.75]);
  box(scene,white,[1.36,.07,.08],[1.35,2.15,-1.75]);
  // Cadre mural et décoration, jamais attachés au personnage.
  box(scene,wood,[.92,.75,.055],[-.40,2.18,-1.82]);
  box(scene,white,[.80,.65,.06],[-.40,2.18,-1.77]);
  box(scene,green,[.37,.20,.06],[-.40,2.20,-1.71]);
  const carpet = new THREE.Mesh(new THREE.CircleGeometry(1.54,48),material(0xe2c4c3));
  carpet.rotation.x=-Math.PI/2;carpet.position.set(0,.004,.26);carpet.scale.set(1,.64,1);
  scene.add(carpet);
}

function inspectMaterialsAndRetainTextures(root) {
  let triangles=0,meshCount=0,skinned=0,materials=0;
  root.traverse(obj=>{
    if (!obj.isMesh) return;
    meshCount++;
    if(obj.isSkinnedMesh)skinned++;
    const idx=obj.geometry?.index;
    const pos=obj.geometry?.attributes?.position;
    triangles+=idx?Math.floor(idx.count/3):pos?Math.floor(pos.count/3):0;
    // Préserver les vraies textures et matériaux : ne pas remplacer
    // les cheveux, la peau et les vêtements par des formes simplifiées.
    const list=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const mat of list){
      if(!mat)continue;
      materials++;
      mat.side=THREE.FrontSide;
      mat.needsUpdate=true;
    }
    obj.castShadow=false;obj.receiveShadow=true;
  });
  return {triangles,meshCount,skinned,materials};
}

async function loadHuman(){
  updateStatus('Chargement du modèle humain 3D…');
  try{
    if(!isAuthorizedAssetUrl(MODEL_URL))throw new Error('Chemin modèle interdit');
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(MODEL_URL);
    if(!gltf?.scene)throw new Error('GLB sans scène');
    if(!gltf.animations?.length)throw new Error('Le GLB ne contient pas d’animation humaine');
    const root = gltf.scene;
    modelStats=inspectMaterialsAndRetainTextures(root);
    if(modelStats.skinned===0)throw new Error('Le GLB n’a pas de maillage articulé');
    const femaleAdaptation=adaptEveDerivedFemaleMesh(root);
    const genesisMaterials=normalizeGenesisMaterials(THREE,root);
    console.info('JULIE V3 — base humaine Genesis adaptée',femaleAdaptation,genesisMaterials);
    const fitted=fitHumanModel(THREE,root,{heightMeters:1.75});
    avatar=new THREE.Group();
    avatar.name='JULIE_001_genesis_eve_derived_base';
    avatar.add(root);
    scene.add(avatar);
    mixer=new THREE.AnimationMixer(root);
    const idle = gltf.animations.find(a=>/idle|stand|repos/i.test(a.name)) || gltf.animations[0];
    const action = mixer.clipAction(idle);
    action.setLoop(THREE.LoopRepeat,Infinity);
    action.clampWhenFinished=false;
    action.play();
    loadedHuman=true;
    updateStatus(`Maillage Genesis chargé • ${Math.round(fitted.height*100)} cm • ${idle.duration.toFixed(1)} s`);
    $('#julie-line').textContent='« Cette fois, mon modèle humain reprend la base d’Ève de Genesis. Je vais encore évoluer. 💕 »';
    console.info('JULIE V3: Genesis modèle chargé', {triangles:modelStats.triangles,bones:modelStats.skinned,clip:idle.name});
  }catch(err){
    loadedHuman=false;
    console.error('JULIE V3 — modèle humain indisponible',err);
    updateStatus('Impossible de charger le modèle humain. La partie discussion reste disponible.');
    const fallback=$('#webgl-fallback');
    if(fallback){fallback.hidden=false;fallback.textContent='Le modèle humain V3 ne s’est pas chargé. Aucun faux avatar géométrique ne sera affiché. Ouvre les réglages ou relance l’application.';}
  }
}

async function initScene(){
  if(!canvas)return;
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:saved.quality!=='eco',powerPreference:'high-performance',alpha:false});
    renderer.setClearColor(0xe6d3d2);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.18;
    renderer.shadowMap.enabled=false;
    scene=new THREE.Scene();
    scene.fog = new THREE.Fog(0xd6c2c1,6,14);
    scene.add(new THREE.HemisphereLight(0xfff7f4,0x968b8d,2.55));
    const key = new THREE.DirectionalLight(0xffe3d4,3.0);
    key.position.set(-2.0,4.4,3.8);scene.add(key);
    const fill = new THREE.DirectionalLight(0xdae9f5,1.15);
    fill.position.set(2.1,2.5,-2.1);scene.add(fill);
    camera=new THREE.PerspectiveCamera(38,1,.06,22);
    buildRoom();onResize();
    bindSceneControls();
    await loadHuman();
    animationLast=performance.now();
    requestAnimationFrame(tick);
  }catch(err){
    console.error('JULIE V3 — erreur 3D',err);
    const f=$('#webgl-fallback'); if(f){f.hidden=false;f.textContent='Affichage 3D indisponible sur ce téléphone.';}
  }
}

function qualityLimit(){return clampFps(saved.quality);}
function onResize(){
  if(!renderer||!camera||!canvas)return;
  const r=canvas.getBoundingClientRect();
  if(r.width<12||r.height<12)return;
  renderer.setPixelRatio(rendererDpr(saved.quality,window.devicePixelRatio||1));
  renderer.setSize(Math.floor(r.width),Math.floor(r.height),false);
  camera.aspect=r.width/r.height;
  camera.fov=r.height>r.width*1.1?43:38;
  camera.updateProjectionMatrix();
}
function bindSceneControls(){
  canvas.addEventListener('pointerdown',e=>{
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    angle+=(e.clientX-pointer.x)*.010;
    tilt=THREE.MathUtils.clamp(tilt+(e.clientY-pointer.y)*.005,-.28,.42);
    pointer.x=e.clientX;pointer.y=e.clientY;
  });
  const up=()=>{pointer=null;};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.003,2.25,5.5);
  },{passive:false});
  window.addEventListener('resize',onResize);
  window.addEventListener('orientationchange',()=>setTimeout(onResize,150));
}
function tick(now){
  requestAnimationFrame(tick);
  if(!renderer||!scene||!camera||document.hidden)return;
  const deltaMs=Math.min(50,Math.max(0,now-animationLast));animationLast=now;
  if(now-renderLast<1000/qualityLimit())return;
  const delta=Math.min(.05,(now-renderLast)/1000 || deltaMs/1000);
  renderLast=now;
  if(mixer&&loadedHuman)mixer.update(delta);
  if(avatar){
    if(turnOn)angle+=delta*.35;
    avatar.rotation.y=angle;
  }
  camera.position.set(0,1.45+tilt,distance);
  camera.lookAt(0,1.01,0);
  renderer.render(scene,camera);
}
$('#btn-turn')?.addEventListener('click',()=>{
  turnOn=!turnOn;
  $('#btn-turn').setAttribute('aria-pressed',String(turnOn));
  $('#btn-turn').style.color=turnOn?'#a9dfb7':'#fff';
});
$('#btn-wave')?.addEventListener('click',()=>{
  // Cette version possède un idle riggé ; l'animation de salut arrive après.
  $('#julie-line').textContent='« Coucou ! Je peux déjà bouger et te regarder avec mon nouveau corps humain. Le salut animé arrivera ensuite. 💕 »';
});
$('#btn-outfit')?.addEventListener('click',()=>{
  $('#julie-line').textContent='« Je garde cette tenue pour le premier modèle humain. Les vêtements personnalisables arriveront après. 😉 »';
});
renderChat();
initScene();
