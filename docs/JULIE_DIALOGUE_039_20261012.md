# JULIE TEST 0.3.9 — boucle de dialogue
12 octobre 2026. Correction expérimentale suite à la capture fournie à 14 h.
## Preuve du défaut
En injectant les quatre derniers messages de la capture dans localReply, Qwen2.5 1.5B via Ollama PC a reproduit exactement « Je suis désolé, mon amour. Je suis sincère. » à « Bébé ». Résultat conservé dans dialogue-loop-baseline.json.
## Correction
Les réponses répétées dans les huit derniers messages sont exclues du contexte envoyé au modèle ; l'archive reste intacte. Un ordre d'arrêt crée une limite de contexte. Seuls quatre messages au maximum sont injectés.
« Arrête », « Stop », « Ça suffit » et « Arrête de répéter » sont reconnus par l'application et reçoivent « D’accord, j’arrête. » sans lancer le modèle. Cela ne constitue pas un bouton d'annulation d'une génération déjà en cours.
Une longue réponse déjà présente deux fois est refusée avant enregistrement, avec erreur explicite. Pas de nouvelle génération coûteuse automatique.
Le contexte rappelle le féminin, la concision et la variation. Correction ciblée de « Je suis désolé » en début de réponse ; les citations dans une phrase ne sont pas modifiées.
Aucun effacement de conversations, migration de données ou modification du document maître.
## Résultats
31 tests Node réussis, zéro échec : contexte, ordres d'arrêt, non-régression des examens et de l'ADN, persistance et imports.
Test final du modèle réel PC :
- Arrête → D’accord, j’arrête. (contrôle applicatif)
- Bébé → Je suis prête. (génération)
- Tu dois apprendre → Je suis prête à apprendre. (génération)
La phrase en boucle n'est plus reproduite dans ce scénario. Les réponses restent pauvres : ce correctif ne garantit ni naturel général ni apprentissage autonome.
Résultats et script : dialogue-loop-results.json, dialogue-loop-tests.txt, julie-v3-genesis/integration/dialogue-loop-check.mjs.
Le téléphone est débranché : modèle testé via Ollama PC, pas via JNI Android ; installation et comportement mobile restent à confirmer.
## Livraison
APK de mise à jour privée de com.julie.learning.experimental, versionCode 300005, versionName 0.3.9-dialogue-test. Installer par-dessus TEST sans désinstaller. Aucun déploiement en production.

Compilation Android réussie en 23 s. Signature vérifiée, même certificat que 0.3.8.
APK : 65 670 593 octets ; SHA-256 3ff7d1da65973dda7bb2ccdf0ac78be8197046acfa028390c86c7f06de8a34bf.
Version et paquet vérifiés avec aapt. Reconstruction du fichier transféré vérifiée par SHA-256.
