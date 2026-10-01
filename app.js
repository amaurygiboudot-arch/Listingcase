const TYPES=[
  ["femme","👩"],
  ["homme","👨"],
  ["non-binaire","🧑"],
  ["androgyne / fluide","✨"]
];

let appState={
  adultConfirmed:false,
  partner:null,
  characters:[],
  mood:null,
  messages:[],
  library:{total:0,available:0},
  providers:{llm:{configured:false},image:{configured:false}}
};
let selected=new Set();
let creatingNew=false;
const mediaJobs=new Set();

const hashParams=new URLSearchParams(location.hash.replace(/^#/,""));
const hashToken=hashParams.get("token")||"";
if(hashToken){
  localStorage.setItem("hpAccessToken",hashToken);
  history.replaceState(null,"",location.pathname+location.search);
}
const appAccessToken=hashToken||localStorage.getItem("hpAccessToken")||"";
const puterReady=()=>Boolean(window.puter?.ai);
const puterSignedIn=()=>Boolean(window.puter?.auth?.isSignedIn?.());

const api=async(path,options={})=>{
  const headers={
    "content-type":"application/json",
    ...(appAccessToken?{"x-app-token":appAccessToken}:{}),
    ...(options.headers||{})
  };
  const r=await fetch(path,{...options,headers});
  const d=await r.json();
  if(!r.ok)throw new Error(d.message||d.error||"api_error");
  return d;
};

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
}[c]));

async function refresh(){
  appState=await api("/api/state");
  render();
}

function ageGate(){
  return `
    <div class="modal">
      <section class="card modal-card">
        <div class="badge">Accès adulte</div>
        <h1>Cette application est réservée aux adultes.</h1>
        <p class="muted">Le MVP utilise une confirmation déclarative. Une vraie vérification d’âge devra être branchée avant publication.</p>
        <div class="actions">
          <button id="adultYes" class="primary">J’ai 18 ans ou plus</button>
          <button id="adultNo" class="secondary">Quitter</button>
        </div>
      </section>
    </div>`;
}

function onboarding(){
  const adding=Boolean(appState.partner&&creatingNew);
  const opts=TYPES.map(([t,e])=>`
    <button class="option ${selected.has(t)?"active":""}" data-interest="${esc(t)}">${e} ${esc(t)}</button>
  `).join("");
  return `
    <div class="modal">
      <section class="card modal-card">
        <div class="badge">${adding?"Nouvelle rencontre":"Première rencontre"}</div>
        <h1>${adding?"Ajouter une nouvelle personne":"Qui peut t’attirer ?"}</h1>
        <p class="muted">On ne déduit pas ton orientation. Choisis simplement les types de personnes qui peuvent t’intéresser.</p>
        <div class="field">
          <div class="options">
            ${opts}
            <button class="option ${selected.has("personnalité")?"active":""}" data-interest="personnalité">💫 surtout la personnalité</button>
          </div>
        </div>
        <div class="notice">La personnalité est générée une fois, puis reste stable. Les humeurs, goûts et la relation évoluent ensuite.</div>
        <div class="actions">
          <button id="createPartner" class="primary">Faire connaissance</button>
          ${adding?`<button id="cancelNewCharacter" class="secondary" type="button">Annuler</button>`:""}
        </div>
      </section>
    </div>`;
}

function landing(){
  return `
    <section class="card hero">
      <h1>Une personne,<br>pas un bouton.</h1>
      <p>Personnalité persistante, mémoire, humeur quotidienne, relation progressive, décisions autonomes et bibliothèque visuelle persistante.</p>
    </section>`;
}

function generationElapsed(media){
  const started=Number(media?.meta?.startedAt||0);
  if(!started)return"";
  const seconds=Math.max(0,Math.floor((Date.now()-started)/1000));
  if(seconds<60)return`${seconds}s`;
  const minutes=Math.floor(seconds/60),rest=seconds%60;
  return`${minutes} min ${String(rest).padStart(2,"0")} s`;
}

function renderMedia(media){
  if(media.status==="ready"&&media.url){
    return `<img class="chat-image" src="${esc(media.url)}?v=${encodeURIComponent(media.id||0)}" alt="${esc(media.alt||"Photo")}" loading="eager" />`;
  }
  if(media.status==="pending"){
    if(media.meta?.localProvider){
      return `
        <div class="media-status pending-media" data-media-id="${media.id}">
          <div>📷 Génération en cours sur ton PC…</div>
          <small>${generationElapsed(media)?`Temps écoulé : ${generationElapsed(media)} • `:""}La photo apparaîtra ici automatiquement dès qu’elle sera prête.</small>
        </div>`;
    }
    return `
      <div class="media-status pending-media" data-media-id="${media.id}">
        <div>📷 Photo prête à être générée</div>
        <button class="secondary generate-media" data-generate-media="${media.id}" type="button">Générer la photo</button>
      </div>`;
  }
  if(media.status==="error"){
    return `<div class="media-status">⚠️ ${esc(media.alt||"La génération de la photo a échoué.")}</div>`;
  }
  return `<div class="media-status">📷 ${esc(media.alt||"Image indisponible")}</div>`;
}

function renderMessage(m){
  return `
    <div class="message ${esc(m.role)}">
      <div>${esc(m.text)}</div>
      ${(m.media||[]).map(renderMedia).join("")}
    </div>`;
}

function characterSwitcher(){
  const chars=appState.characters||[];
  if(!appState.partner)return "";
  const options=chars.map(c=>`<option value="${esc(c.personId)}"${c.active?" selected":""}>${esc(c.name)} • ${esc(c.stage||"relation")}</option>`).join("");
  return `
    <div class="character-switch">
      <label for="characterSelect">Personne active</label>
      <div class="character-switch-row">
        <select id="characterSelect">${options}</select>
        <button id="newCharacter" class="secondary" type="button">+ Nouvelle personne</button>
      </div>
    </div>`;
}

function dashboard(){
  const p=appState.partner;
  const d=appState.mood||{};
  const traits=Object.values(p.personality||{});
  const msgs=appState.messages||[];
  const canonicalUrl=p.canonicalImagePath?"/"+String(p.canonicalImagePath).replace(/^\/+/, ""):"";
  const living=appState.livingIdentity||null;
  const canonicalPersona=appState.canonicalPersona||null;
  const livingState=living?.currentState||{};
  const visuals=[
    ["Emplacements prévus",String(appState.library?.total||0)],
    ["Photos enregistrées",String(appState.library?.available||0)],
    ["Conversation",appState.serverMode==="cloud"?(puterSignedIn()?"Puter cloud":"Puter à connecter"):(appState.providers?.llm?.configured?(appState.providers.llm.model||"modèle local"):"moteur local simple")],
    ["Génération image",appState.serverMode==="cloud"?(puterSignedIn()?"Puter cloud":"Puter à connecter"):(appState.providers?.image?.configured?(appState.providers.image.provider||"moteur local"):"moteur local non installé")],
    ["Humeur",d.mood||"—"],
    ["Émotion persistante",appState.emotional?.tone||"neutre"]
  ];

  const social=appState.lifestyle?.social;
  const socialText=social?.planned
    ?`${social.kind} avec ${social.with} vers ${social.hour}h`
    :"rien de prévu aujourd’hui";

  return `
    <div class="grid">
      <div>
        <section class="card panel">
          <h2>Personnage</h2>
          ${characterSwitcher()}
          <div class="profile">
            <div class="avatar">${({"femme":"👩","homme":"👨","non-binaire":"🧑","androgyne / fluide":"✨"}[p.type]||"🧑")}</div>
            <div>
              <div class="name">${esc(p.name)}</div>
              <div class="muted">${esc(p.type)} • ${esc(p.origin)}</div>
              <div class="chips">${traits.slice(0,5).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><strong>${esc(d.mood||"—")}</strong><span>humeur</span></div>
            <div class="stat"><strong>${p.trust}%</strong><span>confiance</span></div>
            <div class="stat"><strong>${esc(p.stage)}</strong><span>relation</span></div>
          </div>
        </section>

        <section class="card panel" style="margin-top:18px">
          <h2>Identité stable</h2>
          <div class="chips">
            ${p.values.map(x=>`<span class="chip">valeur: ${esc(x)}</span>`).join("")}
            <span class="chip">humour: ${esc(p.humor)}</span>
            <span class="chip">travail: ${esc(p.job)}</span>
            <span class="chip">sport: ${esc(p.sport)}</span>
            <span class="chip">attachement: ${esc(p.attachment)}</span>
          </div>
          <p class="muted">Hobbies : ${p.hobbies.length?p.hobbies.map(esc).join(", "):"aucun hobby précis pour l’instant"}.</p>
          <div class="chips">
            ${(appState.preferences?.partner||[]).slice(0,8).map(x=>`<span class="chip">goût: ${esc(x.topic)} • ${esc(x.label)}</span>`).join("")}
          </div>
        </section>

        ${canonicalPersona?`
        <section class="card panel" style="margin-top:18px">
          <h2>Chloé canonique</h2>
          <div class="library engine-grid">
            <div class="visual engine-card">
              <strong>Relation</strong>
              <small>${esc(canonicalPersona.relationship?.status||"établie")}</small>
            </div>
            <div class="visual engine-card">
              <strong>Dynamique</strong>
              <small>${esc(canonicalPersona.sharedDynamic||"familière")}</small>
            </div>
            <div class="visual engine-card">
              <strong>Voix</strong>
              <small>${esc(canonicalPersona.voice?.address||"tutoiement")} • ${esc(canonicalPersona.voice?.length||"messages courts")}</small>
            </div>
            <div class="visual engine-card">
              <strong>Version canonique</strong>
              <small>${esc(canonicalPersona.version||"—")}</small>
            </div>
          </div>
          <p class="muted">Ce profil fixe la continuité de Chloé avec Amaury. L’identité vivante peut évoluer autour de ce socle sans le remplacer.</p>
        </section>`:""}

        ${living?`
        <section class="card panel" style="margin-top:18px">
          <h2>Identité vivante</h2>
          <div class="library engine-grid">
            <div class="visual engine-card">
              <strong>État courant</strong>
              <small>${esc(livingState.mood||"non établi")} • énergie ${livingState.energy==null?"—":Math.round(livingState.energy*100)+"%"}</small>
            </div>
            <div class="visual engine-card">
              <strong>Événements vécus</strong>
              <small>${esc(living.counts?.events??0)} enregistrés</small>
            </div>
            <div class="visual engine-card">
              <strong>Souvenirs propres</strong>
              <small>${esc(living.counts?.memories??0)} persistants</small>
            </div>
            <div class="visual engine-card">
              <strong>Préférences apprises</strong>
              <small>${esc(living.counts?.preferences??0)} avec preuves</small>
            </div>
          </div>
          <div class="chips" style="margin-top:12px">
            <span class="chip">person_id: ${esc(living.identity?.personId||p.personId)}</span>
            <span class="chip">seed individuel: ${esc(living.identity?.individualSeed||"—")}</span>
            <span class="chip">seed tempérament: ${esc(living.identity?.temperamentSeed||"—")}</span>
          </div>
          <p class="muted">Les changements sont enregistrés comme des deltas : l’identité complète de ${esc(p.name)} n’est jamais régénérée à chaque message.</p>
        </section>`:""}

        <section class="card panel" style="margin-top:18px">
          <h2>Journée & vie perso</h2>
          <div class="library">
            <div class="visual">
              <strong>${esc(appState.lifestyle?.routine?.activity||"—")}</strong>
              <small>${esc(appState.lifestyle?.routine?.availability||"—")} • attention ${esc(appState.lifestyle?.routine?.attention??"—")}%</small>
            </div>
            <div class="visual">
              <strong>Vie sociale</strong>
              <small>${esc(socialText)}</small>
            </div>
          </div>
          <div class="chips" style="margin-top:12px">
            ${(appState.lifestyle?.goals||[]).slice(0,3).map(g=>`<span class="chip">objectif: ${esc(g.title)} • ${esc(g.progress)}%</span>`).join("")}
          </div>
        </section>

        <section class="card panel" style="margin-top:18px">
          <h2>Vie récente</h2>
          <div class="library">
            ${(appState.experiences||[]).slice(0,5).map(x=>`
              <div class="visual">
                <strong>${esc(x.topic)} • ${esc(x.outcome)}</strong>
                <small>${esc(x.note)}</small>
              </div>`).join("")}
          </div>
        </section>

        <section class="card panel" style="margin-top:18px">
          <h2>Moteur visuel</h2>
          <div class="library engine-grid">
            ${visuals.map(([a,b])=>`<div class="visual engine-card"><strong>${esc(a)}</strong><small>${esc(b)}</small></div>`).join("")}
          </div>
          <div class="canonical-panel">
            <div class="canonical-copy">
              <strong>Photo canonique</strong>
              <small>${p.canonicalImagePath?"Configurée et verrouillée":"Manquante • génération bloquée tant qu’aucune référence n’est choisie"}</small>
            </div>
            <div id="canonicalPreview" class="canonical-preview">
              ${canonicalUrl?`<img src="${esc(canonicalUrl)}?v=canonical" alt="Photo canonique de ${esc(p.name)}" />`:`<span>📷</span>`}
            </div>
            <input id="canonicalFile" class="canonical-file-input" type="file" accept="image/*" />
            <div class="canonical-actions">
              <label for="canonicalFile" class="secondary file-picker">📷 Choisir la photo de référence</label>
              <button id="setCanonical" class="primary" type="button">Utiliser comme canonique</button>
            </div>
            <p id="canonicalStatus" class="muted">${p.canonicalImagePath?"La référence actuelle ne change que si tu en choisis volontairement une nouvelle.":"Choisis une photo nette et fidèle au visage du personnage."}</p>
          </div>
        </section>
      </div>

      <section class="card chat">
        <div class="panel">
          <div class="chat-head">
            <div>
              <h2>Conversation</h2>
              <div class="muted">Énergie ${d.energy??"—"}% • affection ${d.affection??"—"}% • sociabilité ${d.social??"—"}%</div>
            </div>
            <span class="badge">${appState.serverMode==="cloud"?"Cloud sécurisé":"100 % local"}</span>
          </div>
        </div>
        <div id="messages" class="messages">${msgs.map(renderMessage).join("")}</div>
        <form id="chatForm" class="composer">
          <input id="chatInput" autocomplete="off" placeholder="Écris-lui quelque chose…" />
          <button class="primary">Envoyer</button>
        </form>
        <div style="padding:0 14px 14px">
          <button id="reset" class="danger">Supprimer ce personnage</button>
        </div>
      </section>
    </div>`;
}

function render(){
  document.querySelector("#app").innerHTML=`
    <main class="shell">
      <div class="topbar">
        <div class="brand">Human Partner</div>
        <div class="badge">${appState.serverMode==="cloud"?"Cloud sécurisé • SQLite":((appState.providers?.llm?.configured?"IA locale":"Moteur local simple")+" • SQLite")}</div>
      </div>
      ${!appState.partner?landing():dashboard()}
    </main>
    ${!appState.adultConfirmed?ageGate():((!appState.partner||creatingNew)?onboarding():"")}
  `;
  bind();
  setTimeout(()=>{
    const m=document.querySelector("#messages");
    if(m)m.scrollTop=m.scrollHeight;
    processPendingMedia();
  },0);
}

function bind(){
  document.querySelector("#adultYes")?.addEventListener("click",async()=>{
    await api("/api/adult",{method:"POST",body:JSON.stringify({confirmed:true})});
    await refresh();
  });

  document.querySelector("#adultNo")?.addEventListener("click",()=>{
    document.body.innerHTML="<main class='shell'><section class='card hero'><h1>Accès fermé.</h1></section></main>";
  });

  document.querySelectorAll("[data-interest]").forEach(btn=>btn.addEventListener("click",()=>{
    const v=btn.dataset.interest;
    selected.has(v)?selected.delete(v):selected.add(v);
    render();
  }));

  document.querySelector("#createPartner")?.addEventListener("click",async()=>{
    const interests=[...selected].filter(x=>x!=="personnalité");
    appState=await api("/api/partner",{method:"POST",body:JSON.stringify({interests})});
    creatingNew=false;
    selected=new Set();
    render();
  });

  document.querySelector("#cancelNewCharacter")?.addEventListener("click",()=>{
    creatingNew=false;
    selected=new Set();
    render();
  });

  document.querySelector("#newCharacter")?.addEventListener("click",()=>{
    creatingNew=true;
    selected=new Set();
    render();
  });

  document.querySelector("#characterSelect")?.addEventListener("change",async e=>{
    const personId=String(e.currentTarget.value||"");
    if(!personId||personId===appState.partner?.personId)return;
    e.currentTarget.disabled=true;
    try{
      appState=await api("/api/partner/select",{method:"POST",body:JSON.stringify({personId})});
      creatingNew=false;
      selected=new Set();
      render();
    }catch(err){
      e.currentTarget.disabled=false;
      console.warn("Character switch failed:",err);
    }
  });

  document.querySelector("#canonicalFile")?.addEventListener("change",async e=>{
    const file=e.currentTarget.files?.[0];
    const preview=document.querySelector("#canonicalPreview");
    const status=document.querySelector("#canonicalStatus");
    if(!file)return;
    try{
      const src=await fileAsDataUri(file);
      if(preview)preview.innerHTML=`<img src="${src}" alt="Aperçu de la photo canonique" />`;
      if(status)status.textContent="Aperçu prêt. Valide seulement si ce visage correspond bien au personnage.";
    }catch(err){
      if(status)status.textContent="Impossible de lire cette image.";
    }
  });

  document.querySelector("#setCanonical")?.addEventListener("click",async()=>{
    const input=document.querySelector("#canonicalFile");
    const button=document.querySelector("#setCanonical");
    const status=document.querySelector("#canonicalStatus");
    const file=input?.files?.[0];
    if(!file){if(status)status.textContent="Choisis d’abord une image.";return}
    if(button)button.disabled=true;
    if(status)status.textContent="Import de la photo canonique…";
    try{
      const imageSrc=await fileAsDataUri(file);
      const out=await api("/api/visual/canonical",{method:"POST",body:JSON.stringify({imageSrc})});
      appState=out.state;
      render();
    }catch(err){
      if(button)button.disabled=false;
      if(status)status.textContent="Échec de l’import : "+(err?.message||"erreur");
    }
  });

  document.querySelector("#chatForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const input=document.querySelector("#chatInput");
    const button=e.currentTarget.querySelector("button");
    const text=input.value.trim();
    if(!text)return;

    input.value="";
    input.disabled=true;
    if(button){button.disabled=true;button.textContent="Réflexion…"}

    const box=document.querySelector("#messages");
    const pending=document.createElement("div");
    pending.className="message partner";
    pending.id="pendingReply";
    pending.textContent="… elle réfléchit";
    box?.appendChild(pending);
    if(box)box.scrollTop=box.scrollHeight;

    try{
      let useClientModel=false;
      if(appState.cloudClientAllowed&&puterReady()){
        if(!puterSignedIn()&&window.puter?.auth?.signIn){
          try{await window.puter.auth.signIn({attempt_temp_user_creation:true})}catch{}
        }
        useClientModel=puterSignedIn()&&Boolean(window.puter?.ai?.chat);
      }

      const out=await api("/api/chat",{
        method:"POST",
        body:JSON.stringify({text,useClientModel})
      });

      if(out.needsClientModel){
        const completed=await completeClientChat(out);
        appState=completed.state;
      }else{
        appState=out.state;
      }
      render();
    }catch(err){
      pending.remove();
      input.disabled=false;
      if(button){button.disabled=false;button.textContent="Envoyer"}
      const box=document.querySelector("#messages");
      const errorBubble=document.createElement("div");
      errorBubble.className="message partner";
      errorBubble.textContent="⚠️ Je n’arrive pas à répondre correctement pour le moment.";
      box?.appendChild(errorBubble);
      if(box)box.scrollTop=box.scrollHeight;
      console.warn("Conversation interrupted:",err);
    }
  });

  document.querySelector("#reset")?.addEventListener("click",async()=>{
    if(confirm(`Supprimer ${appState.partner?.name||"ce personnage"}, sa conversation, sa mémoire et ses photos ?`)){
      appState=await api("/api/partner/delete",{method:"POST",body:"{}"});
      creatingNew=false;
      selected=new Set();
      render();
    }
  });

  document.querySelectorAll("[data-generate-media]").forEach(btn=>{
    btn.addEventListener("click",async()=>{
      const mediaId=Number(btn.dataset.generateMedia);
      const media=findMedia(mediaId);
      if(!media||mediaJobs.has(mediaId))return;
      btn.disabled=true;
      btn.textContent="Connexion / génération…";
      mediaJobs.add(mediaId);
      try{
        if(!puterSignedIn()&&window.puter?.auth?.signIn){
          await window.puter.auth.signIn({attempt_temp_user_creation:true});
        }
        await generateCloudMedia(media);
      }catch(err){
        console.warn("Image cloud:",err);
      }finally{
        mediaJobs.delete(mediaId);
      }
    });
  });

}

async function completeClientChat(out){
  try{
    if(!window.puter?.ai?.chat)throw new Error("cloud_chat_unavailable");
    const response=await window.puter.ai.chat(
      out.generation.messages,
      {model:out.generation.model,normalize:true}
    );
    const reply=String(response?.message?.content||"").trim();
    return await api("/api/chat/complete",{
      method:"POST",
      body:JSON.stringify({pendingId:out.pendingId,reply})
    });
  }catch(err){
    console.warn("Cloud chat failed:",err);
    return await api("/api/chat/complete",{
      method:"POST",
      body:JSON.stringify({pendingId:out.pendingId,reply:""})
    });
  }
}

function findMedia(mediaId){
  for(const message of appState.messages||[]){
    const found=(message.media||[]).find(x=>Number(x.id)===Number(mediaId));
    if(found)return found;
  }
  return null;
}

const fileAsDataUri=file=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||""));
  reader.onerror=()=>reject(reader.error||new Error("image_read_failed"));
  reader.readAsDataURL(file);
});

async function imageSourceAsDataUri(src){
  if(String(src||"").startsWith("data:"))return src;
  const r=await fetch(src);
  if(!r.ok)throw new Error("image_download_failed");
  const blob=await r.blob();
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(reader.error||new Error("image_read_failed"));
    reader.readAsDataURL(blob);
  });
}

async function generateCloudMedia(media){
  try{
    if(!window.puter?.ai?.txt2img)throw new Error("cloud_image_unavailable");
    if(!puterSignedIn())throw new Error("cloud_signin_required");
    const prompt=String(media.meta?.prompt||"").trim();
    if(!prompt)throw new Error("image_prompt_missing");

    const image=await window.puter.ai.txt2img(prompt,{
      provider:"gemini",
      model:"gemini-3.1-flash-image",
      quality:"512",
      ratio:{w:3,h:4}
    });
    const src=image?.src||String(image||"");
    if(!src)throw new Error("image_source_missing");
    const imageSrc=await imageSourceAsDataUri(src);

    const out=await api("/api/media/complete",{
      method:"POST",
      body:JSON.stringify({mediaId:media.id,imageSrc})
    });
    appState=out.state;
    render();
  }catch(err){
    const errorText=err?.message||err?.code||err?.errorCode||String(err);
    try{
      const out=await api("/api/media/fail",{
        method:"POST",
        body:JSON.stringify({mediaId:media.id,error:errorText})
      });
      appState=out.state;
      render();
    }catch{}
    throw err;
  }
}

async function processPendingMedia(){
  if(!appState.cloudClientAllowed||!puterSignedIn()||!window.puter?.ai?.txt2img)return;
  for(const message of appState.messages||[]){
    for(const media of message.media||[]){
      if(media.status!=="pending"||media.meta?.clientProvider!=="puter"||mediaJobs.has(media.id))continue;
      mediaJobs.add(media.id);
      generateCloudMedia(media).finally(()=>mediaJobs.delete(media.id));
    }
  }
}

async function pollInitiative(){
  if(!appState.partner||document.hidden)return;
  try{
    const out=await api("/api/initiative",{method:"POST",body:"{}"});
    if(out.initiative){
      appState=out.state;
      render();
    }
  }catch{}
}

setInterval(pollInitiative,5*60*1000);

async function pollPendingLocalMedia(){
  if(document.hidden||!appState.partner)return;
  const pending=(appState.messages||[]).some(message=>
    (message.media||[]).some(media=>media.status==="pending"&&media.meta?.localProvider)
  );
  if(!pending)return;
  try{await refresh()}catch{}
}
setInterval(pollPendingLocalMedia,3000);

async function bootstrap(){
  if(appAccessToken){
    try{
      await fetch("/api/session",{
        method:"POST",
        headers:{"x-app-token":appAccessToken},
        credentials:"include"
      });
    }catch{}
  }
  return refresh();
}

bootstrap().catch(err=>{
  document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="card hero">
        <h1>Connexion au cerveau en cours…</h1>
        <p>${esc(err.message)}</p>
        <p class="muted">L’application réessaiera automatiquement.</p>
      </section>
    </main>`;
});
