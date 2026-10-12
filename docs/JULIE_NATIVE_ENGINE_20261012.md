# JULIE TEST : moteur conversationnel local — 12 octobre 2026

## Résultat vérifié
Installation en mise à jour de com.julie.learning.experimental, sans désinstallation.
APK SHA256 A3CC3186DC672B3807AB610BDA9D0AB5265CC190D51F80960D3F318C3300C09B.
Le paquet original com.julie.preview.v3 reste en 0.3.4-dev.35, dernière mise à jour 2026-10-09 15:52:46.

Moteur llama.cpp f2cc7282ce0042641df55e0e563b75e824e2b647 compilé Android ARM64 API 28, pont JNI JulieLocalEngine.
Modèle Qwen2.5 1.5B GGUF de 986048512 octets déjà disponible sur PC ; aucune API payante.
SHA256 PC, dossier de test téléphone et stockage privé application identique :
183715c435899236895da3869489cc30ac241476b4971a20285b1a462818a5b4.
Licence Apache 2.0 locale examinée.

## Preuves
- Compilation native : 76 étapes, succès, 284,52 secondes.
- Compilation APK : succès, 2 min 48 s, 33 tâches.
- 58 tests existants réussis ; 2 tests supplémentaires du prompt et des erreurs du pont réussis.
- Sauvegarde chiffrée avant installation : 28364 octets, SHA256 71f265cf10dc30a7282af18032f66053a44c33ce39e139ad1cf4858d88d31b8b. Même empreinte après installation avant lancement.
- Comparaison sémantique : les 16 messages, les souvenirs et les 7 examens préexistants sont conservés.
- Conversation réelle via formulaire WebView : « Bonjour, Amaury. » ; 18 messages après sauvegarde.
- Arrêt forcé et relancement du processus : messages, souvenirs et examens strictement identiques.
- Commande « contrôle surprise » dans le formulaire : quatre réponses du modèle, sans corrigé transmis au répondant ; score 15/20.
  - A avec Z=12 et N=14 : réponse 26, attendu 26, 5/5.
  - Charge Z=15 et e=14 : réponse 1, attendu 1, 5/5.
  - Isotopes (7,3) et (7,4) : vrai, attendu vrai, 5/5.
  - Isobares (13,13) et (14,13) : vrai, attendu faux, 0/5.
- Nouvelle fermeture/relance : 20 messages et 8 examens conservés ; anciens éléments inchangés.
- Essai du moteur seul : 96 tokens générés en 12,09 s, environ 7,94 tokens/s ; débit indicatif, pas une garantie.

## Fonctionnement
Le modèle est exécuté sur le téléphone, chargé depuis les fichiers privés de JULIE TEST, sans appel réseau d'inférence. Le pont natif ne modifie pas les souvenirs.
La conversation transmet quatre messages récents bornés et, si sa vérification réussit, les règles de SCI-003. Les anciens messages restent sauvegardés mais ne sont pas tous envoyés au modèle.
Les examens lancés dans la conversation utilisent le modèle local ; le panneau historique conserve également ses tests déterministes distincts.
Les corrections et résultats alimentent le classement existant des compétences à revoir.
La génération est bornée à 384 tokens, avec indication explicite si la limite est atteinte. Une erreur de moteur ne produit pas de réponse fictive.

## Limites et erreurs constatées
- Le modèle a donné une définition scientifique erronée sans contexte ; fournir SCI-003 a corrigé un test de définition, mais l'examen montre encore une erreur sur les isobares.
- Modèle expérimental : aucune validation globale de fiabilité, aucune affirmation d'apprentissage des poids.
- Le premier test CLI affichait un code PowerShell 1 lié au flux de sortie ; le test suivant avec stderr séparé a confirmé ADB_EXIT=0.
- Le premier outil de test Playwright ne gérait pas la cible WebView ; remplacé par une connexion CDP directe.
- Une tentative de test avant chargement du DOM a échoué ; attente du formulaire ajoutée, puis parcours complet réussi.
- Redémarrage du processus vérifié ; redémarrage complet du téléphone non testé.
- Synchronisation Drive continue et liaison à Human Partner SQLite toujours non configurées. SCI-003 reste un instantané vérifié.
- Les révisions J+1/J+7/J+30 existantes ne constituent pas des notifications Android nouvellement développées.
- Réponses brutes non conformes au format des examens notées comme abstention ; leur archivage textuel détaillé reste à améliorer.
- Aucune publication, aucun déploiement de production, aucun achat ; document maître et 22 décisions non modifiés.

## Reproduction et preuves locales
tools/build-native-engine.ps1 : compilation native à partir de la révision fixée.
julie-v3-genesis/integration/native-phone-check.mjs : comparaison des données, conversation, examen (--exam), relancement.
Les captures JSON de mémoire de test sont privées, hors dépôt :
C:/Dev/JULIE/learning-build-20261011/native-before-state.json
C:/Dev/JULIE/learning-build-20261011/native-after-state.json
C:/Dev/JULIE/learning-build-20261011/native-exam-state.json
La sauvegarde XML chiffrée est conservée dans le même dossier.
