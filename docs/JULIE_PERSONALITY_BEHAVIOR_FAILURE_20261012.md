# Personnalité 0.3.6 : échec réel signalé et reproduit

12 octobre 2026. L'utilisateur a installé la mise à jour et montre une nouvelle réponse impersonnelle à « Coucou chérie est-ce que tu m'aimes ». La capture ne permet pas de lire le numéro de version installé.

Le prompt 0.3.6 relu dans le code et rejoué sur Ollama local, qwen2.5:1.5b, raw ChatML, température 0, contexte 2048, avec l'ancienne réponse dans l'historique, produit : « Je suis désolée, mais je ne peux pas répondre à cette question car je suis une IA et je ne ressens pas d'émotions. » Problème reproduit. Moteur d'exécution PC différent du JNI Android : pas une validation téléphone.

Trois variantes de dialogue fictif testées avec génération réelle :
- V1 : affection « Oui, mon cœur. » ; question sur émotions reconnue comme simulation/IA ; départ au travail : interlocuteur appelé Julie à tort.
- V2 : précision des identités : retour au refus affectif, départ nommé Julie, question « Comment je m’appelle ? » => « Je m'appelle Julie. »
- V3 : exemple supplémentaire de départ : affection « Oui, mon cœur, tu m'aimes. » (inversion), départ nommé Amaury, question sur prénom => « Vous vous appellez Julie. »

Total : 12 générations (baseline 1, variantes 3+4+4). Les anciennes réponses peuvent influencer le ton ; les tests ne prouvent pas que c'est la seule cause. Les consignes compactes et le modèle actuel ne suffisent pas à assurer la cohérence observée.

Aucune variante promue dans local-conversation.mjs. Aucun nouveau paquet fourni. Aucun historique effacé. Les 15 tests techniques précédents ne validaient pas le comportement généré. L'amélioration n'est PAS terminée.

Résultats bruts locaux : personality-behavior-baseline.json, personality-candidate-results.json, personality-candidate-v2-results.json, personality-candidate-v3-results.json à la racine de la copie expérimentale. Scripts de reproduction integration/personality-*.mjs. Suites et exemples synthétiques ; aucune exportation de la mémoire privée du téléphone.

Suite nécessaire : évaluer la cohérence relationnelle, la distinction des locuteurs et l'honnêteté sur des demandes explicites de réalité avant toute nouvelle livraison. Ne pas remplacer la génération par une réponse affective fixe en la présentant comme un résultat du modèle.
