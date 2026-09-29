import { getSetting,setSetting } from "./db.js";

const key=profile=>`visualScene:${profile.personId||profile.seed}`;
const home=new Set(["chambre","salon","cuisine"]);
const shortTrip=new Set(["voiture","parc","café"]);

export function minimumTravelMinutes(from,to){
  if(!from||!to||from===to)return 0;
  if(home.has(from)&&home.has(to))return 2;
  if(shortTrip.has(from)&&shortTrip.has(to))return 10;
  if(from==="plage"||to==="plage")return 30;
  return 20;
}

export function resolveVisualScene(profile,request={},now=Date.now()){
  const last=getSetting(key(profile),null);
  if(!last?.place||!Number.isFinite(last.at)||now<last.at)return{allowed:true,request:{...request}};
  const wanted=request.place;
  const elapsed=(now-last.at)/60000;
  if(wanted&&wanted!==last.place&&elapsed<minimumTravelMinutes(last.place,wanted)){
    return{allowed:false,request:{...request},place:last.place,
      reason:`Je suis encore ${last.place === "chambre"?"dans la chambre":last.place === "salon"?"au salon":last.place === "plage"?"à la plage":`à ${last.place}`}. Je ne peux pas me retrouver ${wanted === "plage"?"à la plage":`à ${wanted}`} tout de suite.`};
  }
  // A location-free request stays in the last known place for a short period.
  if(!wanted&&elapsed<20)return{allowed:true,request:{...request,place:last.place},place:last.place};
  return{allowed:true,request:{...request}};
}

export function noteVisualScene(profile,place,at=Date.now()){
  if(place)setSetting(key(profile),{place,at});
}
