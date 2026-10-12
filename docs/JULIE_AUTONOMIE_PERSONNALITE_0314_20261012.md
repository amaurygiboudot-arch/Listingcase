# JULIE Learning 0.3.14 — personnalité contextuelle autonome (expérimental)
Date : 12 octobre 2026 (heure de Paris).
Source de travail : C:\Dev\JULIE\autopersonality-20261012
Branche locale : feat/julie-autopersonality-20261012
Base : f2d9394, issue du vrai canal JULIE Learning (pas JULIE Preview).
Document maître et les 22 étapes validées : inchangés.

## Comportement intégré
- Les utilisateurs parlent normalement : aucun menu ou justification requis pour que le ton change selon le thème (aide technique, conversation affectueuse, échanges difficiles, apprentissage).
- Humeur momentanée **simulée**, calculée à partir des mots du dialogue, sans affirmation sur l'état émotionnel réel de l'utilisateur ; son indication expire après 4 heures.
- Évolution durable d'un trait uniquement après trois préférences claires et concordantes, exprimées à trois moments différents espacés d'au moins 15 minutes ; un message isolé, une citation ou un texte généré ne suffit pas.
- Intégration à l'ADN existant : événements de type trait, avec date, raison, source « dialogue direct confirmé », sans modifier le socle JULIE_001, les accords, les permissions ou les évolutions manuelles antérieures.
- Réglages manuels conservés mais rangés dans « Réglages manuels avancés (facultatifs) ».
- Prompt 3B raccourci/contexte conservé ; l'identité virtuelle n'est pas répétée spontanément, mais les questions sur la réalité doivent rester sincères.
- L'utilisateur peut continuer à corriger ses réglages et consulter les évolutions ; aucune ingestion automatique des réponses produites par le modèle.

## Validation démontrée
- 26/26 tests ciblés réussis (ADN, dialogue, stockage et mémoire).
- 97/97 tests de la suite complète du sous-projet réussis sur EDUCTOR.
- Bundle esbuild : succès, script 2 017 753 octets.
- Compilation Gradle hors ligne : BUILD SUCCESSFUL en 2 min 45 s ; 33 tâches.
- APK : com.julie.learning.experimental, versionCode 300010, versionName 0.3.14-autonomie-test.
- Fichier : C:\Dev\JULIE\packages\JULIE-TEST-0.3.14-autonomie.apk (65 691 309 octets).
- SHA-256 : f468784e4be4603f512ff5a139346d5141523f1592e64ad0f6d39df6a8e0c9b8.
- Certificat apksigner : 668bbf6dbcc590da70a37b0102a59407a3539f0146ccf24b68c3d0f6061499c2 ; identique au paquet installé connu 0.3.12.
- Les six bibliothèques natives .so sont bit-à-bit identiques à l'APK 0.3.12, de sorte que le moteur 3B et les optimisations natives sont conservés.
- adb install -r : « Success », code de retour 0, aucune désinstallation.
- adb dumpsys package : versionCode 300010 et versionName 0.3.14-autonomie-test confirmés sur le Redmi.
- Lancement Android (monkey) : succès ; activité MainActivity au premier plan et processus actif (PID 20450).

## Limites et points de contrôle
- Ces tests vérifient une adaptation déterministe et traçable, **pas** un réentraînement autonome de Qwen ni une conscience.
- Le modèle 3B peut encore produire des réponses maladroites ; aucune évaluation longue et réelle de ses réponses sur téléphone n'est confirmée.
- Une installation par-dessus conserve normalement les données Android, mais nous n'avons pas encore comparé le nombre des souvenirs et évolutions visibles avant et après la mise à jour. Ne pas prétendre à une sauvegarde indépendante du téléphone.
- Pas d'accès à une mémoire d'autres conversations ChatGPT ni d'ajout de photos à cette étape.
- Ne pas fusionner d'ancien prototype ni changer la signature ; ne jamais désinstaller avant sauvegarde utilisateur explicite.
- Aucun appel API payant et aucune minute GitHub Actions dépensée pour cette compilation locale.

## Prochaine vérification
Vérifier dans l'onglet Souvenirs de l'APK installée que les deux évolutions antérieures sont toujours visibles, puis contrôler sur des dialogues consentis par l'utilisateur la reconnaissance des préférences, la franchise sur la nature virtuelle et le naturel des réponses. Rechercher des anomalies dans les journaux Android sans exporter les conversations privées.

## Contrôle complémentaire après lancement — appareil réel
- ADB confirme l'activité JULIE Learning visible au premier plan et son processus actif.
- Métadonnées Android du stockage privé uniquement, **sans ouvrir ni exporter le contenu** : `shared_prefs/julie_v3_preview_state.xml` existe toujours, 68 752 octets, horodatage le 12 octobre à 18 h 57, avant l'installation de 0.3.14 à 20 h 42. Cela démontre la conservation du fichier local à la mise à jour, mais pas encore la relecture et l'intégrité de tous les souvenirs.
- Le contenu privé de la mémoire et les anciennes évolutions n'ont pas été consultés. Le test final de cohérence avec les échanges et la présence des 2 évolutions de l'ancienne capture reste à confirmer par l'utilisateur.
- Un screenshot de diagnostic temporaire du téléphone a été supprimé du PC ; aucun screenshot ou export de mémoire n'a été versé dans GitHub.

## Validation réelle complémentaire — 12 octobre, après installation
- Inspection Android de l'écran `Souvenirs → ADN numérique` : `JULIE_001 · socle fondateur conservé · 2 évolution(s)` confirmé par l'arbre d'accessibilité.
- Arrêt du processus et redémarrage de l'application, puis nouvelle lecture : `2 évolution(s)` toujours présentes. Le premier essai de lecture immédiatement après lancement était trop précoce ; la seconde lecture après chargement complet confirme le résultat.
- L'interface affiche la tendance contextuelle et la priorité `dialogue` sans exiger de menu ; aucune modification manuelle effectuée.
- Dans les Réglages Android : `Modèle actif : 3B`, version `0.3.14-autonomie-test` confirmées.
- Aucun message de test n'a été envoyé à JULIE : la conformité du dialogue réel 3B (naturel, mémoire contextuelle, absence de rappels IA inutiles) nécessite encore un essai conversationnel volontaire de l'utilisateur.
- Aucun souvenir, aucune réponse et aucun identifiant personnel issu de l'application n'ont été exportés dans GitHub.
