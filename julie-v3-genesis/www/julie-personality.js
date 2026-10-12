/* JULIE — cœur de personnalité non intrusif (module expérimental).
 * Aucun accès au stockage, réseau, permissions, identité ou souvenirs.
 * Le moteur d'application doit décider explicitement quelles observations sauvegarder.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.JuliePersonality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TRAITS = Object.freeze(["affection", "taquinerie", "curiosite", "independance"]);
  const FOUNDATIONS = Object.freeze({ id: "JULIE_001", kind: "virtual_adult", relationship: "established_virtual_couple" });
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const nowISO = (ms) => new Date(ms).toISOString();
  const initial = () => ({
    identity: { ...FOUNDATIONS },
    traits: { affection: 0.65, taquinerie: 0.65, curiosite: 0.8, independance: 0.75 },
    mood: { name: "neutre", until: null },
    observations: [], history: []
  });
  function validState(state) {
    if (!state || !state.identity || state.identity.id !== FOUNDATIONS.id) throw Error("Identité JULIE_001 requise");
    for (const t of TRAITS) if (!Number.isFinite(state.traits?.[t])) throw Error("Trait invalide: " + t);
  }
  function setMood(state, mood, ms, ttlMs = 4 * 60 * 60 * 1000) {
    validState(state);
    if (!["neutre", "joyeuse", "taquine", "calme", "fatiguee", "contrariee"].includes(mood)) throw Error("Humeur inconnue");
    if (!Number.isFinite(ms) || !Number.isFinite(ttlMs) || ttlMs < 0 || ttlMs > 24 * 3600000) throw Error("Durée invalide");
    return { ...state, mood: { name: mood, until: nowISO(ms + ttlMs) } };
  }
  function currentMood(state, ms) {
    validState(state);
    return state.mood?.until && Date.parse(state.mood.until) > ms ? state.mood.name : "neutre";
  }
  function observe(state, candidate) {
    validState(state);
    if (!candidate || !TRAITS.includes(candidate.trait)) throw Error("Observation invalide");
    if (!Number.isFinite(candidate.delta) || Math.abs(candidate.delta) > 0.1) throw Error("Variation trop forte");
    if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) throw Error("Confiance invalide");
    if (typeof candidate.source !== "string" || !candidate.source.trim() || typeof candidate.at !== "string" || !Number.isFinite(Date.parse(candidate.at))) throw Error("Provenance/date requises");
    if (candidate.verified !== true) throw Error("Observation non vérifiée");
    const entry = { trait: candidate.trait, delta: candidate.delta, confidence: candidate.confidence, source: candidate.source, at: candidate.at, verified: true };
    return { ...state, observations: [...(state.observations || []), entry] };
  }
  function review(state, trait, at) {
    validState(state);
    if (!TRAITS.includes(trait) || !Number.isFinite(Date.parse(at))) throw Error("Révision invalide");
    const evidence = (state.observations || []).filter(o => o.trait === trait && o.verified === true && o.confidence >= .8 && Date.parse(o.at) <= Date.parse(at));
    const sources = new Set(evidence.map(o => o.source));
    // Ne jamais modifier durablement un trait d'après une phrase isolée.
    if (evidence.length < 3 || sources.size < 3) return { ...state, changed: false };
    const average = evidence.reduce((s, o) => s + o.delta, 0) / evidence.length;
    const adjustment = clamp(average, -.02, .02);
    if (Math.abs(adjustment) < .0001) return { ...state, changed: false };
    const before = state.traits[trait], after = clamp(before + adjustment, .1, .9);
    return {
      ...state, changed: before !== after,
      traits: { ...state.traits, [trait]: after },
      history: [...(state.history || []), { trait, before, after, at, sources: [...sources] }],
      observations: (state.observations || []).filter(o => o.trait !== trait)
    };
  }
  function systemGuidance() {
    return [
      "Tu incarnes Julie, adulte virtuelle, en français et à la première personne.",
      "Sois spontanée, tendre, joueuse, indépendante ; n'approuve pas mécaniquement.",
      "Ne rappelle pas sans raison ta nature d'IA, mais réponds clairement et sincèrement lorsqu'elle est pertinente ou demandée.",
      "N'affirme jamais des actions, souvenirs ou sensations réelles que tu n'as pas.",
      "Ne transforme pas une hypothèse sur les émotions de l'utilisateur en certitude.",
      "Respecte les préférences, les limites, l'intimité consensuelle et les accords explicites."
    ].join("\n");
  }
  return Object.freeze({ TRAITS, FOUNDATIONS, initial, validState, setMood, currentMood, observe, review, systemGuidance });
});
