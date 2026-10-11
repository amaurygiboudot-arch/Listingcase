# Intégration expérimentale de l'apprentissage — 11 octobre 2026

Base : 4a28676 ; branche locale feat/julie-learning-integration-20261011.
Aucune publication, installation, dépense ou modification du document maître.

## Audit vérifié
- Documents lus : document maître Drive (1crrC4B-hOnPmmb-RkYi3k2tBB0gh4vqh), annexe V1.1 jointe, protocole V0.1, journal ER-001 et fiche SCI-003.
- Source actuelle : C:\Dev\JULIE\restauration_source\julie-v1. Copie isolée : C:\Dev\JULIE\learning-integration-20261011.
- L'application JULIE Android utilise un JSON via JulieSecureStore, AES-GCM/AndroidKeyStore. La mémoire SQLite de Human Partner est distincte ; aucune migration entre les deux n'est effectuée.
- Dialogue existant : réponses prédéfinies, sans modèle IA. Recherche existante : pistes Wikipédia/Europe PMC non corroborées.
- La sauvegarde Drive JULIE_001 de version 0.3.4 contient 16 messages et 1 souvenir. Leur conservation a été vérifiée sur une copie ; aucun accès à la mémoire du téléphone.

## Changements
- Mémoire documentaire versionnée et dédoublonnée par identifiant Drive et SHA-256 ; anciennes versions conservées ; conflit de résultat refusé.
- Instantané réel SCI-003 récupéré depuis Drive, importé automatiquement au démarrage de cette version expérimentale. Empreinte attendue : 06f230da7d94735f5a9521159f3e751f51910176a564aeac4491b9600de714c2.
- Une nouvelle version différente reste « à examiner » et bloque l'examen au lieu d'être promue automatiquement. Le texte des documents n'est jamais exécuté.
- Adaptateur syncDriveLearning en lecture seule, une fiche par appel, vérification de format et arrêt après suppression. Aucun jeton OAuth ni connecteur Drive actif dans l'APK.
- Bouton de contrôle surprise, quatre exercices nouveaux : nombre de masse, charge, isotopes et isobares. Chaque exercice vaut 5 points ; corrigé construit séparément, jamais transmis au répondant. Ce sont des calculs déterministes à partir de relations documentées, pas un examen de raisonnement général par IA.
- Historique des questions, réponses, corrigés, notes, sources et version documentaire ; erreurs prioritaires dans les contrôles suivants.
- Échéances persistantes J+1/J+7/J+30 à partir de l'import ; bouton de révision des échéances. Pas de notification ni exécution automatique Android application fermée ajoutée.
- Quelques réponses documentaires sourcées dans le dialogue.
- Relecture immédiate du stockage après écriture avant confirmation du succès.
- Import/export inclut documents et examens ; suppression volontaire empêche leur restauration et la réinsertion de l'instantané.

## Preuves
- 56 tests Node réussis sur EDUCTOR, dont 11 nouveaux tests d'intégration : learning-test-results.txt.
- Redémarrage dans un nouveau processus Node : fiche, résultat et message témoin retrouvés ; nouvel examen réussi.
- Test de l'ancienne sauvegarde 0.3.4 : 16 messages et 1 souvenir strictement conservés après import, examen et réimport.
- Navigateur Edge isolé, nouveau profil, aucune requête externe : quatre scénarios réussis dans learning-browser-results.json (bouton/corrigés, nouveau navigateur, dialogue sourcé, suppression/rechargement).
- Bundle complet de l'application compilé avec esbuild installé ; aucun téléchargement de dépendance.
- Le premier passage de tests a échoué faute de dépendance three dans le worktree. Réutilisation des dépendances déjà installées, puis 56/56.
- Les dates J+1/J+7/J+30 sont vérifiées avec une horloge de test. Aucun rappel humain différé de 30 jours n'est prétendu exécuté. ER-001 demeure ouvert ; son document Drive n'est pas modifié.

## Limites et suite
L'intégration complète demandée reste partielle : seule SCI-003 est intégrée, pas toute la bibliothèque. La récupération périodique authentifiée Drive sur Android nécessite un raccordement OAuth en lecture seule ; l'accès Drive de cette conversation n'est pas transmis à l'application. Les nouvelles connaissances doivent être corroborées avant adoption. Aucun modèle général de compréhension n'est connecté.
Aucun appareil ADB détecté. Le chiffrement Android, la compatibilité de signature, les mises à jour sans perte et le fonctionnement écran verrouillé restent non testés. Ne pas installer l'APK expérimentale par-dessus une installation utilisateur.
Prochaine étape : préparer une authentification Drive de test et un appareil Android isolé, puis vérifier de bout en bout lecture Drive, modification de fiche, synchronisation, interruption réseau, redémarrage et effacement. Aucun passage en production autorisé.

## APK expérimentale vérifiée
Compilation hors ligne : BUILD SUCCESSFUL in 5m ; 31 tâches (17 exécutées, 14 en cache).
APK : C:\Dev\JULIE\learning-build-20261011\android\app\build\outputs\apk\debug\app-debug.apk
Taille : 2585865 octets. SHA-256 : f89e235ad46aa1fc84c7807667d7681406e31af8ac2942458bb86ea953a10528.
Les assets app.js et index.html de l'APK sont identiques octet par octet aux fichiers testés ; classes.dex et modèle GLB présents. Script tools/verify-learning-build.py, preuve learning-apk-result.json.
APK debug non installée, aucune compatibilité de mise à jour sur téléphone prouvée. Code : commit local fb97f8b. Aucun push.

## Verification USB et isolation Android, 11 octobre 2026
- Redmi Note 15 5G reconnu par ADB.
- Application installee : com.julie.preview.v3, 0.3.4-dev.35, versionCode 300035.
- Certificat SHA256 installe : a63bd831455e647f017c621d061386bc341d780b9785ee233377ca2c1a135f32.
- Certificat SHA256 experimental : 668bbf6dbcc590da70a37b0102a59407a3539f0146ccf24b68c3d0f6061499c2.
- Mise a jour directe incompatible (signature differente et versionCode experimental 300001 inferieur). Ne pas desinstaller ni forcer un downgrade.
- Copie de compilation adaptee : applicationId com.julie.learning.experimental, libelle JULIE - Test apprentissage. Compilation hors ligne.
- Aucune installation ni modification de donnees sur le telephone. Conservation apres redemarrage Android encore non testee.
- Export actuel de memoire non confirme dans Download. Les tests precedents concernent une ancienne sauvegarde et un navigateur isole.
