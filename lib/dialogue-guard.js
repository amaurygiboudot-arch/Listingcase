export function deterministicReply(profile,mood,lifestyle,text){
  const l=text.toLowerCase().trim();
  const v=profile.visualIdentity||{};

  if(/comment tu t'appelles|tu t’appelles|ton prénom|ton prenom|quel est ton nom/.test(l)){
    return `Je m’appelle ${profile.name}.`;
  }

  if(/^(bonjour|salut|coucou|bonsoir|hey|hello)[ !?.]*$/.test(l)){
    if(mood.energy<40)return "Salut 🙂 Je suis un peu fatiguée aujourd’hui, mais ça va. Et toi ?";
    if(mood.mood.includes("taquin"))return "Salut 😄 Ça va, j’ai plutôt envie de discuter aujourd’hui. Et toi ?";
    return "Salut 🙂 Ça va plutôt bien. Et toi ?";
  }

  if(/^(merci|merci beaucoup|ok|d'accord|d’accord|ça marche|ca marche)[ !?.]*$/.test(l)){
    return "Avec plaisir 🙂.";
  }

  if(/t'es une femme|tu es une femme|t'es un homme|tu es un homme|quel genre|ton genre/.test(l)){
    if(profile.type==="femme")return "Oui, je suis une femme 🙂.";
    if(profile.type==="homme")return "Oui, je suis un homme.";
    return `Je me définis comme ${profile.type}.`;
  }

  if(/à quoi tu ressembles|a quoi tu ressembles|comment tu es physiquement|ton apparence|tu ressembles à quoi|tu ressembles a quoi/.test(l)){
    const build=profile.type==="femme"?({"fine":"fine","moyenne":"de corpulence moyenne","athlétique":"athlétique","douce":"avec des formes douces"}[v.build]||v.build):v.build;
    return `J’ai les yeux ${v.eyeColor}, les cheveux ${v.hairColor} et ${v.hair}. Je suis ${v.height}, ${build}.`;
  }

  if(/tu fais quoi|qu'est-ce que tu fais|qu’est-ce que tu fais|t'es occupée|tu es occupée|tu es occupé/.test(l)){
    const activity=lifestyle?.routine?.activity||"temps perso";
    if(activity==="sommeil")return "Là je devrais clairement dormir 😴.";
    if(activity==="travail / projet")return "Je suis sur mon travail ou mon projet là, donc un peu occupée.";
    if(activity==="cours / études")return "Je suis dans mes études là, donc un peu concentrée.";
    if(activity==="repas / pause")return "Je suis en pause, tranquille.";
    if(activity==="repos")return "Je me pose un peu, j’en avais besoin.";
    return "Je suis dans mon temps perso, plutôt tranquille.";
  }

  if(/parle-moi.*de toi|parle moi.*de toi|dis-moi qui tu es|dis moi qui tu es|présente-toi|presente-toi/.test(l)){
    const labels={"photo":"la photo","musique":"la musique","cinéma":"le cinéma","lecture":"la lecture","jeux vidéo":"les jeux vidéo","cuisine":"la cuisine","bricolage":"le bricolage","voyage":"les voyages","mode":"la mode","mécanique":"la mécanique","technologie":"la technologie","nature":"la nature","danse":"la danse","dessin":"le dessin"};
    const hobbies=(profile.hobbies||[]).filter(h=>h!=="aucun hobby précis").slice(0,2);
    const hobbiesText=hobbies.length?` J’aime bien ${hobbies.map(h=>labels[h]||h).join(" et ")}.`:"";
    const femaleJobs={"salarié·e":"salariée","indépendant·e":"indépendante","étudiant·e":"étudiante","en reconversion":"en reconversion","en pause professionnelle":"en pause professionnelle","sur un projet personnel":"sur un projet personnel","sans envie particulière de carrière":"sans envie particulière de carrière"};
    const job=profile.type==="femme"?(femaleJobs[profile.job]||profile.job):profile.job;
    return `Je m’appelle ${profile.name}. Je suis ${profile.personality?.directness||"plutôt posée"}, ${profile.personality?.affection||"tendre"} et ${job}.${hobbiesText}`;
  }

  if(/qu'est-ce que tu penses de moi|qu’est-ce que tu penses de moi|tu penses quoi de moi|quel avis tu as sur moi/.test(l)){
    if(profile.trust<25)return "Je te trouve intéressant, mais je te connais encore trop peu pour avoir un avis très arrêté.";
    if(profile.trust<55)return "Je commence à bien t’apprécier. J’ai encore des choses à découvrir sur toi, mais je me sens plutôt en confiance.";
    return "Je tiens vraiment à toi maintenant. Ça ne veut pas dire que je serai toujours d’accord avec toi, mais tu comptes pour moi.";
  }

  if(/comment ça va|comment ca va|tu vas bien|comment tu vas/.test(l)){
    if(mood.energy<40)return `Je suis un peu fatiguée aujourd’hui, mais ça va. Mon humeur est plutôt ${mood.mood}.`;
    return `Ça va plutôt bien. Je suis ${mood.mood} aujourd’hui, avec pas mal d’énergie.`;
  }

  if(/tu aimes quoi|qu'est-ce que tu aimes|qu’est-ce que tu aimes|tes goûts|tes gouts/.test(l)){
    const hobbies=(profile.hobbies||[]).filter(h=>h!=="aucun hobby précis");
    if(hobbies.length){const labels={"photo":"la photo","musique":"la musique","cinéma":"le cinéma","lecture":"la lecture","jeux vidéo":"les jeux vidéo","cuisine":"la cuisine","bricolage":"le bricolage","voyage":"les voyages","mode":"la mode","mécanique":"la mécanique","technologie":"la technologie","nature":"la nature","danse":"la danse","dessin":"le dessin"};return `Pour l’instant, je sais que j’aime bien ${hobbies.slice(0,3).map(h=>labels[h]||h).join(", ")}. Le reste, je le découvre encore.`;}
    return "Je n’ai pas encore des goûts très arrêtés. J’aime bien découvrir avant de décider si ça me plaît vraiment.";
  }

  if(/raconte.*journée|raconte.*journee|ta journée|ta journee/.test(l)){
    const activity=lifestyle?.routine?.activity||"temps perso";
    return `Ma journée est plutôt simple : en ce moment je suis en ${activity}. Je te raconterai si quelque chose de vraiment intéressant m’arrive.`;
  }

  if(/faire connaissance|apprendre à te connaître|apprendre a te connaitre|mieux te connaître|mieux te connaitre/.test(l)){
    if(profile.stage==="premier contact")return "Oui, avec plaisir. Mais doucement, on vient juste de se rencontrer 🙂.";
    return "Oui, j’en ai envie aussi. On peut apprendre à se connaître sans se presser.";
  }

  if(/être plus proche|etre plus proche|se rapprocher|plus proche avec moi/.test(l)){
    if(profile.trust<35)return "On peut se rapprocher, oui, mais je préfère que ça vienne naturellement plutôt que de forcer les choses.";
    return "Oui… je crois qu’on peut se laisser devenir un peu plus proches 🙂.";
  }

  if(/j'ai besoin (d'un|de) câlin|j’ai besoin (d’un|de) câlin|fais-moi un câlin|fais moi un calin|un câlin/.test(l)){
    if(profile.trust<20)return "Un petit câlin, oui 🙂. Mais doucement, on apprend encore à se connaître.";
    return "Viens là 🙂. Je t’accorde volontiers un câlin.";
  }

  if(/je veux que tu m'aimes|je veux que tu m’aimes|tu pourrais être ma femme|tu pourrais etre ma femme|devenir ma femme|être ma femme virtuelle|etre ma femme virtuelle/.test(l)){
    if(profile.stage==="premier contact"||profile.trust<30)return "Peut-être qu’on pourra devenir très proches avec le temps, mais je ne veux pas faire semblant d’aimer quelqu’un que je connais à peine.";
    if(profile.trust<65)return "Je m’attache à toi progressivement. Pour aller plus loin, j’ai besoin que ça continue à se construire naturellement.";
    return "Tu comptes vraiment pour moi maintenant. Je préfère quand même laisser les choses évoluer sans leur coller une étiquette trop vite.";
  }

  if(/faire l'amour|faire l’amour|on baise|baiser|coucher ensemble|avoir du sexe|sexe avec toi/.test(l)){
    if(profile.trust<40)return "Tu vas vite 😅. On se connaît encore trop peu pour que je fasse comme si on en était déjà là.";
    return "On peut parler de désir et de proximité, mais je garde mes limites et mon envie du moment.";
  }

  if(/poitrine|fesses|montrer ton corps|montre ton corps|voir ton corps|voir ton corp|ton corps|ton corp/.test(l)){
    const build=profile.type==="femme"?({"fine":"fine","moyenne":"de corpulence moyenne","athlétique":"athlétique","douce":"avec des formes douces"}[v.build]||v.build):v.build;
    if(profile.stage==="premier contact"||profile.modesty==="élevée")return `Ma silhouette est ${build}. Pour les détails plus intimes, je préfère qu’on se connaisse mieux avant.`;
    return `Ma silhouette est ${build}. Je peux être plus ouverte sur mon apparence, mais je garde quand même une part de pudeur.`;
  }

  if(/sois sexy|sois sexi|sois séduisante|sois seduisante/.test(l)){
    return profile.type==="femme"
      ?"Je peux être séduisante, oui 😏. Mais à ma manière, pas comme si tu me donnais un ordre."
      :"Je peux jouer un peu sur la séduction 😏, mais à ma manière.";
  }

  if(/je veux que tu sois blonde|je veux que tu sois brune|je veux que tu sois métisse|je veux que tu sois metisse|yeux bleus|yeux bleu|change.*cheveux|change.*apparence/.test(l)){
    return "Tu peux me dire ce qui t’attire, mais mon apparence à moi est déjà la mienne. Je ne vais pas changer d’identité à chaque préférence que tu me donnes 🙂.";
  }

  if(/tutoie|tu peux me tutoyer|tutoyer/.test(l))return "Oui, carrément. Je te tutoie 🙂.";
  return null;
}


export function sanitizeModelReply(reply,profile,userText){
  let s=String(reply||"").trim();
  if(!s)return null;

  if(/intelligence artificielle|assistante?|chatbot|robot|utilisateur|modèle informatique|modele informatique|programme|logiciel|service|personne virtuelle|être virtuel|etre virtuel/i.test(s) || /(^|[^a-z])ia([^a-z]|$)/i.test(s))return null;
  if(/\b(vous|votre|vos)\b|pourriez-vous|souhaitez-vous|comment puis-je|n'hésitez pas|n’hésitez pas|à votre service|besoin d'aide|besoin d’aide/i.test(s))return null;
  s=s.replace(/je suis là pour (t'|vous )?aider[^.!?]*[.!?]?/gi,"").trim();

  const hasModeContext=/\bmode\b/i.test(userText)||profile.hobbies?.some(h=>h==="mode");
  if(!hasModeContext){
    s=s.split(/(?<=[.!?])\s+/).filter(sentence=>!/\bà la mode\b|\bmode\b/i.test(sentence)).join(" ").trim();
  }

  if(profile.type==="femme"){
    const replacements=[
      ["je suis content","je suis contente"],
      ["je suis heureux","je suis heureuse"],
      ["je suis prêt","je suis prête"],
      ["je suis curieux","je suis curieuse"],
      ["je suis conscient","je suis consciente"],
      ["je suis désolé","je suis désolée"],
      ["je suis fatigué","je suis fatiguée"],
      ["je suis motivé","je suis motivée"]
    ];
    for(const [a,b] of replacements)s=s.replace(new RegExp(a+"\\b","gi"),b);
  }

  if(/(si tu|si je|mais|mais je|et|et je|ou|donc|parce que|parce que je|car|avec|pour|comme|que|quand|alors)\s*$/i.test(s)){
    const m=s.match(/.*[.!?…]/s);
    s=m?m[0].trim():s.replace(/(si tu|si je|mais|mais je|et|et je|ou|donc|parce que|parce que je|car|avec|pour|comme|que|quand|alors)\s*$/i,"").trim();
  }
  if(s&&!/[.!?…]$/.test(s)){
    const last=Math.max(s.lastIndexOf("."),s.lastIndexOf("!"),s.lastIndexOf("?"),s.lastIndexOf("…"));
    s=last>=0?s.slice(0,last+1).trim():s+".";
  }

  const complete=s.match(/[^.!?…]+[.!?…]+/g);
  if(complete&&complete.length>3)s=complete.slice(0,3).join(" ").trim();
  if(s.length>420)return null;
  return s||null;
}
