# JULIE — JOURNAL DE REPRISE PERMANENT
Mise à jour : 11/10/2026, après vérification du build de 19 h 57 (heure de Paris).
Statut : prêt pour validation Android sur appareil de test. Aucun travail en cours déclaré.
Document maître : https://drive.google.com/file/d/1crrC4B-hOnPmmb-RkYi3k2tBB0gh4vqh/view
Décisions : conserver les 22 étapes validées. Ne pas modifier le document maître sans accord.

## Règle impérative de reprise
Avant toute nouvelle action : lire ce journal, consulter le document maître, vérifier les fichiers et la branche Git réels. Reprendre la première étape NON TERMINÉE, sans répéter une compilation déjà réussie. Mettre ce journal à jour après une action réellement vérifiée. Distinguer terminé, non vérifié, en cours et bloqué. Ne jamais inventer de travail réalisé en arrière-plan.

## État confirmé
- EDUCTOR accessible via Remote Desktop Commander (identifiant d'appareil conservé par le connecteur).
- Dépôt local : C:\Dev\JULIE\restauration_source\julie-v1
- Branche courante vérifiée : feat/julie-research-audit-20261010
- Commit de référence : c0b54bf730ae0f644a8de739dccf1d0f85266ed1 (à revérifier avant modification).
- Moteur local d'apprentissage V0.1, recherche Android V0.2, références Europe PMC V0.3 : code présent dans le dépôt.
- Installation des outils : esbuild 0.25.12, three 0.181.1, playwright-core 1.56.1.
- Le 11/10/2026 : 45 tests Node réussis sur 45.
- Bundle JavaScript 3D : 1 955 305 octets, compilé avec esbuild.
- Modèle humain GLB : 2 767 576 octets ; rig de 53 contrôleurs vérifié.
- Compilation Gradle : BUILD SUCCESSFUL en 3 min 16 s, 31 tâches.
- APK debug créée, structure et signature vérifiées :
  C:\Dev\JULIE\JULIE-build-test-20261011-195325\android\app\build\outputs\apk\debug\app-debug.apk
- APK 2 576 985 octets ; applicationId com.julie.preview.v3 ; version 0.3.5-verification-locale.
- SHA256 APK : 41BF8E33A40C0A78E08389E684043ADAE56DED4FF4D3673F694A13E7B8AB25D7
- Signature : Android Debug ; certificat SHA256 668bbf6dbcc590da70a37b0102a59407a3539f0146ccf24b68c3d0f6061499c2
- Rapport détaillé : C:\Dev\JULIE\JULIE-build-test-20261011-195325\JULIE_BUILD_VALIDATION_20261011.txt
- Journal de compilation : C:\Dev\JULIE\JULIE-build-test-20261011-195325\BUILD_RESULTATS_JULIE.txt
- Aucune APK installée, aucune publication, aucune donnée de l'application utilisateur modifiée.

## À ne pas confondre
- Une APK debug compilée n'est PAS une mise à jour signée compatible avec la version actuelle.
- Les 45 tests sont des tests automatisés de code ; aucun test réel du JobScheduler téléphone verrouillé ni du stockage chiffré n'est encore confirmé.
- Une source scientifique trouvée n'est pas une connaissance scientifiquement corroborée.
- Ce journal décrit l'état du développement ; il n'est pas le moteur de mémoire de JULIE dans l'application.

## Prochaine action précise
1. Identifier le package et le certificat de l'APK JULIE déjà installée avant toute tentative de mise à jour.
2. Préparer un scénario d'essai sans perte de données sur appareil ou émulateur isolé ; ne PAS désinstaller l'application actuelle.
3. Tester démarrage WebView/3D, persistance chiffrée, import/export, suppression et anti-résurrection, recherche Wi-Fi JobScheduler après fermeture/verrouillage.
4. Documenter les résultats réels et les erreurs, puis seulement décider de la suite du développement de l'apprentissage.
5. Après validation, envisager intégration/fusion selon les autorisations, sans modifier les 22 décisions.

## Protocole de fin de séance
- Inscrire la date et l'heure, la dernière opération vérifiée, les fichiers/commits concernés, les tests et leurs résultats, les blocages, et UNE prochaine action précise.
- Si une opération est encore en cours, indiquer son identifiant de processus et la manière de vérifier sa fin ; ne pas prétendre qu'elle continue sans preuve.
- Ne jamais écraser ce journal avec un état plus ancien. Préserver les données et les suppressions.
