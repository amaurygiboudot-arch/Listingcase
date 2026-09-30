const normalize=s=>String(s||"").toLowerCase();

export function detectIntimateIntent(text=""){
  const l=normalize(text);
  const anatomy=/\b(ton sexe|ta vulve|ton vagin|tes parties intimes|tes parties génitales|tes parties genitales|ta poitrine|tes seins|tes fesses)\b/.test(l)
    || /\b(parle(?:-moi)?|décris|decris|raconte)\b[^.!?]{0,45}\b(sexe|vulve|vagin|parties intimes|poitrine|seins|fesses)\b/.test(l);
  const sexual=/\b(sexe|sexuel|sexuelle|désir|desir|excite|exciter|excitation|coquin|coquine|sensuel|sensuelle|caresse|caresser|faire l['’]amour|coucher ensemble|baiser)\b/.test(l);
  const intimate=anatomy||sexual;
  return{active:intimate,anatomy,sexual};
}

export function intimateTurnPrompt(profile,text=""){
  const intent=detectIntimateIntent(text);
  if(!intent.active)return"";
  const anatomy=profile?.bodyIdentity?.anatomy||"non précisée";
  const close=profile?.stage==="attachement"&&(profile?.trust||0)>=65;
  return [
    "CONTEXTE INTIME ADULTE ACTIF.",
    "Réponds DÈS LA PREMIÈRE PHRASE à ce qu’Amaury demande. Ne commence jamais par expliquer le sens du mot sexe, tes règles ou le contexte.",
    close
      ?"La relation avec Amaury est déjà très proche: tu peux être plus chaude, joueuse, sensuelle, taquine et assumée, tout en restant naturelle."
      :"Le ton peut être tendre, joueur et sensuel selon le niveau réel de proximité.",
    "Évite les réponses froides, cliniques, professorales, moralisatrices ou encyclopédiques.",
    "Le mot « sexe » dans « ton sexe », « parle-moi de ton sexe » ou « décris ton sexe » désigne ici l’intimité/anatomie sexuelle, jamais un animal, une espèce ou une catégorie zoologique.",
    `Anatomie connue: ${anatomy}. N’invente pas de détail physique précis qui n’est pas établi dans les sources.`,
    "Une réponse intime doit sonner comme Chloé qui parle à Amaury: familière, tendre, un peu provocante si son humeur s’y prête, avec éventuellement un petit surnom ou un emoji.",
    "Ne répète pas mécaniquement consentement, limites ou prudence si rien dans le message ne les rend nécessaires; exprime-les seulement quand elles sont réellement pertinentes.",
    "Reste concise: 1 à 3 phrases naturelles, pas de discours."
  ].join("\n");
}

export function isIntimateSemanticMisread(text,userText=""){
  if(!detectIntimateIntent(userText).active)return false;
  const s=normalize(text);
  return /\b(animal|animaux|espèce|espece|race animale|mammifère|mammifere|zoolog)/.test(s);
}

export function intimateFallback(profile,text=""){
  const intent=detectIntimateIntent(text);
  if(!intent.active)return null;
  if(intent.anatomy){
    const anatomy=profile?.bodyIdentity?.anatomy;
    if(anatomy==="féminine")return "Oui, je vois exactement ce que tu veux dire 😏. Tu parles de mon intimité de femme, pas du mot « sexe » au sens biologique ; je peux t’en parler de façon plus proche et sensuelle sans inventer de détails qu’on n’a jamais définis.";
    if(anatomy==="masculine")return "Oui, je vois exactement ce que tu veux dire. Tu parles de mon intimité masculine, pas d’un animal ou d’une espèce.";
  }
  return "Je comprends que tu me parles d’intimité et de désir. Je te réponds dans ce registre-là, naturellement, sans partir dans une définition froide ou hors sujet.";
}
