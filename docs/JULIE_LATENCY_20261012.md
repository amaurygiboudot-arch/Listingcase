# Réactivité du moteur local — 12 octobre 2026

Correction installée dans com.julie.learning.experimental.
APK SHA256 0de78e8f875278f608ea9cf9dd0c61f78c518e299617b5a37621289927a67e35.

Le modèle reste chargé entre les messages tant que l'activité est vivante. Un exécuteur natif distinct du traitement JavaScript effectue la génération. Le téléphone transmet les fragments progressivement ; seule la réponse terminée est enregistrée par le mécanisme existant.
La fermeture de l'activité demande l'arrêt au prochain fragment et libère ensuite le modèle. Les échecs et requêtes simultanées restent explicites.
Pas de réduction de modèle, de contexte ou de limite de réponse dans cette correction.

## Mesures sur le téléphone
Même prompt court, sans historique, avant correction :
- essai 1 : réponse affichée en 3318 ms ;
- essai 2 : réponse affichée en 3332 ms.
Après correction :
- démarrage à froid : premier fragment 3281 ms, réponse complète 4337 ms ;
- modèle déjà chargé : premier fragment 1682 ms, réponse complète 2680 ms.
Le premier essai à froid est plus lent au total dans cette mesure. Ne pas présenter le gain à chaud comme universel.

Test avec historique réel dans le formulaire :
- premiers mots : 11174 ms ;
- réponse complète observée : 14370 ms ;
- 8 mises à jour progressives de la bulle, 284 ticks de la boucle UI ;
- 32 anciens messages strictement préservés, 34 messages après le test ;
- souvenirs et examens identiques ; réponse complète conservée après arrêt forcé et relancement.
La lecture du contexte reste une source de délai : la conversation n'est pas instantanée.

## Vérifications
Compilation JNI et APK réussies (23 s pour Gradle).
60 tests existants réussis, puis 2 nouveaux tests du protocole asynchrone réussis.
Sauvegarde des données chiffrées avant mise à jour et comparaison exacte après installation :
SHA256 2724f995d710b0be8846289747b00a8ed3a1b163b9129a170cf1ee67aee520ba.
Un premier générateur du script de test UI n'avait pas ajouté le corps du test : corrigé, aucun succès fonctionnel déduit de cette première exécution vide. Le test complet a ensuite réussi.

Preuves privées hors dépôt : latency-before.json, latency-after.json et streaming-ui-result.json dans C:/Dev/JULIE/learning-build-20261011.
Scripts reproductibles : integration/native-latency-check.mjs et integration/native-stream-ui-check.mjs.
Aucune modification du document maître, aucune publication, aucun achat.
