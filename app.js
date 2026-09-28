const TYPES=[
  ["femme","👩"],
  ["homme","👨"],
  ["non-binaire","🧑"],
  ["androgyne / fluide","✨"]
];

let appState={
  adultConfirmed:false,
  partner:null,
  mood:null,
  messages:[],
  library:{total:0,available:0},
  providers:{llm:{configured:false},image:{configured:false}}
};
let selected=new Set();
const mediaJobs=new Set();

const api=async(path,options={})=>{
  const r=await fetch(path,{headers:{"content-type":"application/json"},...options});
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
  const opts=TYPES.map(([t,e])=>`
    <button class="option ${selected.has(t)?"active":""}" data-interest="${esc(t)}">${e} ${esc(t)}</button>
  `).join("");
  return `
    <div class="modal">
      <section class="card modal-card">
        <div class="badge">Première rencontre</div>
        <h1>Qui peut t’attirer ?</h1>
        <p class="muted">On ne déduit pas ton orientation. Choisis simplement les types de personnes qui peuvent t’intéresser.</p>
        <div class="field">
          <div class="options">
            ${opts}
            <button class="option ${selected.has("personnalité")?"active":""}" data-interest="personnalité">💫 surtout la personnalité</button>
          </div>
        </div>
        <div class="notice">La personnalité est générée une fois, puis reste stable. Les humeurs, goûts et la relation évoluent ensuite.</div>
        <button id="createPartner" class="primary">Faire connaissance</button>
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

function renderMedia(media){
  if(media.status==="ready"&&media.url){
    return `<img class="chat-image" src="${esc(media.url)}" alt="${esc(media.alt||"Photo")}" loading="lazy" />`;
  }
  if(media.status==="pending"){
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

function dashboard(){
  const p=appState.partner;
  const d=appState.mood||{};
  const traits=Object.values(p.personality||{});
  const msgs=appState.messages||[];
  const clientImageReady=Boolean(window.puter?.ai?.txt2img);
  const visuals=[
    ["Catalogue",String(appState.library?.total||0)+" emplacements"],
    ["Photos de ce personnage",String(appState.library?.available||0)],
    ["Modèle texte",appState.providers?.llm?.configured?(appState.providers.llm.model||"connecté"):"mode local"],
    ["Génération image",appState.providers?.image?.configured?appState.providers.image.provider:(clientImageReady?"Puter prêt":"non connectée")],
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
          <div class="library">
            ${visuals.map(([a,b])=>`<div class="visual"><strong>${esc(a)}</strong><small>${esc(b)}</small></div>`).join("")}
          </div>
        </section>
      </div>

      <section class="card chat">
        <div class="panel">
          <h2>Conversation</h2>
          <div class="muted">Énergie ${d.energy??"—"}% • affection ${d.affection??"—"}% • sociabilité ${d.social??"—"}%</div>
        </div>
        <div id="messages" class="messages">${msgs.map(renderMessage).join("")}</div>
        <form id="chatForm" class="composer">
          <input id="chatInput" autocomplete="off" placeholder="Écris-lui quelque chose…" />
          <button class="primary">Envoyer</button>
        </form>
        <div style="padding:0 14px 14px">
          <button id="reset" class="danger">Recommencer avec une autre personne</button>
        </div>
      </section>
    </div>`;
}

function render(){
  document.querySelector("#app").innerHTML=`
    <main class="shell">
      <div class="topbar">
        <div class="brand">Human Partner</div>
        <div class="badge">${appState.providers?.llm?.configured?"LLM local connecté":"Moteur local simple"} • SQLite</div>
      </div>
      ${!appState.partner?landing():dashboard()}
    </main>
    ${!appState.adultConfirmed?ageGate():(!appState.partner?onboarding():"")}
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
    render();
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
      const out=await api("/api/chat",{method:"POST",body:JSON.stringify({text})});
      appState=out.state;
      render();
    }catch(err){
      pending.remove();
      input.disabled=false;
      if(button){button.disabled=false;button.textContent="Envoyer"}
      alert("Conversation interrompue : "+err.message);
    }
  });

  document.querySelector("#reset")?.addEventListener("click",async()=>{
    if(confirm("Supprimer ce personnage, la conversation et sa mémoire ?")){
      appState=await api("/api/reset",{method:"POST",body:"{}"});
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
        await generatePuterMedia(media,true);
      }finally{
        mediaJobs.delete(mediaId);
      }
    });
  });
}

function findMedia(mediaId){
  for(const m of appState.messages||[]){
    const found=(m.media||[]).find(x=>Number(x.id)===Number(mediaId));
    if(found)return found;
  }
  return null;
}

async function processPendingMedia(){
  if(!appState.partner||!window.puter?.ai?.txt2img)return;
  if(!window.puter?.auth?.isSignedIn?.())return;
  const pending=[];
  for(const m of appState.messages||[]){
    for(const media of m.media||[]){
      if(media.status==="pending"&&media.meta?.clientProvider==="puter")pending.push(media);
    }
  }
  for(const media of pending){
    if(mediaJobs.has(media.id))continue;
    mediaJobs.add(media.id);
    generatePuterMedia(media,false).finally(()=>mediaJobs.delete(media.id));
  }
}

async function generatePuterMedia(media,allowSignIn=false){
  try{
    if(!window.puter?.ai?.txt2img)throw new Error("Puter n’est pas encore chargé.");
    if(!window.puter?.auth?.isSignedIn?.()){
      if(!allowSignIn)throw new Error("Connexion Puter nécessaire.");
      await window.puter.auth.signIn({attempt_temp_user_creation:true});
    }
    const prompt=media.meta?.prompt;
    if(!prompt)throw new Error("Prompt image manquant.");

    const image=await window.puter.ai.txt2img(prompt,{
      provider:"gemini",
      model:"gemini-3.1-flash-image",
      quality:"512",
      ratio:{w:3,h:4}
    });
    const src=image?.src||String(image||"");
    if(!src)throw new Error("Aucune image reçue.");

    const out=await api("/api/media/complete",{
      method:"POST",
      body:JSON.stringify({mediaId:media.id,imageSrc:src})
    });
    appState=out.state;
    render();
  }catch(err){
    let errorText;
    try{
      errorText=err?.message||err?.error?.message||err?.code||err?.errorCode||JSON.stringify(err);
    }catch{
      errorText=String(err);
    }
    try{
      const out=await api("/api/media/fail",{
        method:"POST",
        body:JSON.stringify({mediaId:media.id,error:String(errorText||"client_generation_failed")})
      });
      appState=out.state;
      render();
    }catch{
      const el=document.querySelector(`[data-media-id="${media.id}"]`);
      if(el)el.textContent="⚠️ Génération de la photo impossible.";
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

refresh().catch(err=>{
  document.querySelector("#app").innerHTML=`
    <main class="shell">
      <section class="card hero">
        <h1>Backend indisponible</h1>
        <p>${esc(err.message)}</p>
        <p class="muted">Lance <code>npm start</code> dans le dépôt.</p>
      </section>
    </main>`;
});
