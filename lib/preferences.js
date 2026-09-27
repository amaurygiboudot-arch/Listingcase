import { db } from "./db.js";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function getPreferences(owner="partner",limit=50){
  return db.prepare("SELECT owner,topic,score,confidence,reason,exposures,updated_at FROM preferences WHERE owner=? ORDER BY confidence DESC, ABS(score) DESC, updated_at DESC LIMIT ?").all(owner,limit);
}

export function getPreference(owner,topic){
  return db.prepare("SELECT owner,topic,score,confidence,reason,exposures,updated_at FROM preferences WHERE owner=? AND topic=?").get(owner,topic)||null;
}

export function evolvePreference({owner="partner",topic,delta=0,reason=null,confidenceDelta=0.08}){
  if(!topic)return null;
  const clean=topic.trim().toLowerCase().slice(0,120);
  if(!clean)return null;
  const prev=getPreference(owner,clean);
  const exposures=(prev?.exposures||0)+1;
  const damp=1/(1+Math.max(0,exposures-1)*0.18);
  const score=clamp(Math.round((prev?.score||0)+(delta*damp)),-100,100);
  const confidence=clamp((prev?.confidence||0.08)+confidenceDelta*damp,0.05,1);
  const finalReason=reason||prev?.reason||null;
  db.prepare(`
    INSERT INTO preferences(owner,topic,score,confidence,reason,exposures,updated_at)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(owner,topic) DO UPDATE SET
      score=excluded.score,
      confidence=excluded.confidence,
      reason=COALESCE(excluded.reason,preferences.reason),
      exposures=excluded.exposures,
      updated_at=excluded.updated_at
  `).run(owner,clean,score,confidence,finalReason,exposures,Date.now());
  return getPreference(owner,clean);
}

const topicPatterns=[
  ["musique",/\b(musique|chanson|rap|rock|metal|jazz|electro|pop)\b/i],
  ["films",/\b(film|cinéma|cinema|série|serie)\b/i],
  ["jeux vidéo",/\b(jeu vidéo|jeux vidéo|gaming|console|playstation|xbox|pc gamer)\b/i],
  ["voitures",/\b(voiture|auto|automobile|volvo|bmw|mercedes|audi|peugeot|renault)\b/i],
  ["mécanique",/\b(mécanique|mecanique|moteur|réparer|reparer)\b/i],
  ["sport",/\b(sport|course|musculation|fitness|football|vélo|velo|natation)\b/i],
  ["voyage",/\b(voyage|vacances|partir|étranger|etranger)\b/i],
  ["cuisine",/\b(cuisine|cuisiner|recette|restaurant|manger)\b/i],
  ["technologie",/\b(technologie|informatique|ordinateur|smartphone|ia|intelligence artificielle)\b/i],
  ["nature",/\b(nature|forêt|foret|plage|mer|montagne|randonnée|randonnee)\b/i],
  ["mode",/\b(mode|vêtement|vetement|tenue|style|coiffure)\b/i],
  ["lecture",/\b(livre|lecture|roman|lire)\b/i],
  ["animaux",/\b(chat|chien|animal|animaux)\b/i]
];

function detectTopic(text){
  for(const [topic,re] of topicPatterns)if(re.test(text))return topic;
  return null;
}

function sentimentDelta(text){
  const l=text.toLowerCase();
  if(/\b(j'adore|j’adore|j'aime beaucoup|je kiffe|excellent|génial|genial|trop bien)\b/.test(l))return 28;
  if(/\b(j'aime|j’aime|j'apprécie|j’apprécie|plutôt sympa|pas mal)\b/.test(l))return 16;
  if(/\b(je déteste|je deteste|horreur|nul|nulle|insupportable)\b/.test(l))return -28;
  if(/\b(j'aime pas|j’aime pas|je n'aime pas|je n’aime pas|pas mon truc)\b/.test(l))return -16;
  return 0;
}

export function learnUserPreference(text){
  const topic=detectTopic(text),delta=sentimentDelta(text);
  if(!topic||!delta)return null;
  return evolvePreference({owner:"user",topic,delta,reason:text.slice(0,220),confidenceDelta:0.12});
}

export function learnPartnerPreferenceFromReply(text){
  const topic=detectTopic(text),delta=sentimentDelta(text);
  if(!topic||!delta)return null;
  return evolvePreference({owner:"partner",topic,delta,reason:text.slice(0,220),confidenceDelta:0.09});
}

export function seedInitialPreferences(profile){
  const existing=getPreferences("partner",5);
  if(existing.length)return existing;
  for(const hobby of profile.hobbies||[]){
    if(hobby==="aucun hobby précis")continue;
    evolvePreference({owner:"partner",topic:hobby,delta:18,reason:"Intérêt initial cohérent avec ses hobbies",confidenceDelta:0.08});
  }
  if(profile.sport?.includes("déteste"))evolvePreference({owner:"partner",topic:"sport",delta:-24,reason:"Rapport initial au sport",confidenceDelta:0.15});
  else if(profile.sport?.includes("très sportif"))evolvePreference({owner:"partner",topic:"sport",delta:24,reason:"Rapport initial au sport",confidenceDelta:0.15});
  return getPreferences("partner",20);
}

export function preferenceLabel(score){
  if(score>=65)return"adore";
  if(score>=30)return"aime";
  if(score>=10)return"plutôt positif";
  if(score<=-65)return"déteste";
  if(score<=-30)return"n'aime pas";
  if(score<=-10)return"plutôt négatif";
  return"indécis";
}

export function preferenceContext(owner="partner",limit=18){
  return getPreferences(owner,limit).map(p=>({
    topic:p.topic,
    label:preferenceLabel(p.score),
    score:p.score,
    confidence:Number(p.confidence.toFixed(2)),
    exposures:p.exposures,
    reason:p.reason
  }));
}
