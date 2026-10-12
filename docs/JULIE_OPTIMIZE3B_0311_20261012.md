# JULIE TEST 0.3.11 — optimisation du 3B conservé
12 octobre 2026. Demande explicite : optimiser le 3B, ne pas imposer un retour au 1,5B.
## Changements
Contexte dédié au 3B : retrait des exemples artificiels à chaque génération ; consigne compacte sur le féminin, le tutoiement, les surnoms et la prise en compte du dernier message.
Les quatre derniers messages utiles restent fournis après le filtrage existant des boucles. Aucun message archivé supprimé, aucune migration d'état et aucune modification du choix du modèle.
Les réglages ADN continuent d'être ajoutés au contexte. Les examens restent isolés de la personnalité.
Mesures natives Android avec horloge monotone : délai de la première sortie non vide et durée totale de la tentative. Affichage dans Réglages → Moteur de conversation. Aucune conversation envoyée pour collecter ces mesures ; données uniquement en mémoire.
Le modèle déjà importé est réutilisé, sans nouveau téléchargement. Pas de modification du binaire llama.cpp, des poids, du nombre de threads ni d'accélération GPU/NPU dans cette version.
## Comparaison réelle
Qwen2.5 3B présent dans Ollama PC, température 0, contexte 2048, modèle gardé chargé entre les quatre essais. Même historique transcrit depuis la capture.
Question « Et toi bébé qu'est-ce que tu fais de beau » :
- ancien contexte : 1393 caractères / 349 jetons ; réponse « Je suis ici pour discuter, bébé. Que puis-je faire pour toi aujourd'hui ? »
- compact : 769 caractères / 196 jetons ; réponse « Bébé, je suis là pour t'accompagner dans toutes tes aventures, même quand tu rentres au travail. »
Réduction des jetons de contexte : 43,8 %. La charge de traitement est réduite ; ce chiffre n'est pas un pourcentage de vitesse gagnée.
Question de correction « Je rentre au travail, pas chez moi. Tu as compris ? » :
- ancien : « Oui, tu rentres au travail. »
- compact : « Oui, je comprends, tu rentres au travail. Comment ça va pour toi aujourd'hui ? »
La sortie incohérente exacte de la capture n'a pas été reproduite sur PC. Le test confirme deux réponses pertinentes avec la variante, sans garantir tous les échanges.
Temps totaux PC : 83,4 / 4,2 / 34,7 / 6,2 s. Le premier inclut 36,5 s de chargement. Réutilisation du cache de préfixe par Ollama : ne pas présenter ces chiffres comme un benchmark Android ou une comparaison équitable de vitesse bout à bout. Poids Ollama pouvant différer du GGUF Android.
Preuves : optimize-3b-results.json ; script integration/optimize-3b-check.mjs.
## Vérifications
33 tests Node réussis. Un test passe par localReply avec un moteur simulé et vérifie que le contexte réellement envoyé pour 3B est exactement celui évalué, moins de 60 % des caractères du contexte précédent, et que l'historique n'est pas modifié.
Examens, imports, stockage, ADN et traitement des boucles restent couverts.
Test d'interface Edge isolé : mesures affichées avec les bonnes unités, commandes du modèle conservées. Passerelle Android simulée.
Téléphone débranché : les nouveaux délais et la qualité doivent encore être mesurés sur le téléphone. Aucune promesse de fluidité générale.
Document maître V1.2 consulté en lecture seule. Son index de julie-v1/0.3.5 ne remplace pas cette branche expérimentale connue et ses APK 0.3.x.
