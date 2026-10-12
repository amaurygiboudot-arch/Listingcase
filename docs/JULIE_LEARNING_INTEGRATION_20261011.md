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

Compilation isolee : BUILD SUCCESSFUL (3m41s), 31 taches. APK com.julie.learning.experimental, non installee. Voir learning-build-20261011/isolated-build.log.


## Installation autorisee avec TEST en premier
Libelle APK verifie : TEST - JULIE Apprentissage.
Package : com.julie.learning.experimental.
ADB install : Success. Lancement a froid : Status ok, 1608 ms.
Deux packages presents. JULIE originale conserve versionCode 300035, versionName 0.3.4-dev.35 et lastUpdateTime 2026-10-09 15:52:46.
Aucune desinstallation ni remplacement de JULIE originale. Les examens et la persistance Android restent a verifier ; le premier arbre UI ne montre que le conteneur WebView.

## Controles dans la conversation
Demande Amaury : controles directement dans Parler. Conservation apres fermeture confirmee par Amaury le 11/10/2026.
Commande controle surprise : examen, correction, source et note ajoutes au dialogue avec sauvegarde atomique de l historique. Affichage vrai/faux.
Deux tests Node cibles passes. Le test navigateur a expire pendant la navigation localhost ; validation interface non acquise. Compilation Android lancee, resultat encore non confirme. Aucune mise a jour installee pour ce changement.
Limite : commande de lancement uniquement, questions libres non encore prises en charge.

## Audit moteur conversationnel local, 11 octobre 2026
Ollama present. Modeles disponibles : qwen2.5 0.5b/1.5b/3b, qwen3 0.6b/1.7b, moondream.
PC : 6219928 kB RAM totale, 271344 kB libres lors du controle. Applications Chrome et Blender actives, non fermees.
Telephone ADB : 7569356 kB RAM totale, 1720416 kB disponibles, 149 Go stockage disponible. NDK/CMake non trouves aux emplacements SDK controles.
Essai REEL Ollama localhost /api/chat : qwen2.5:0.5b, contexte 512, 1 thread, maximum 80 tokens, keep_alive=0. Aucun service distant payant.
Resultat : 47 tokens en 58.123 secondes, reponse FAUSSE confondant protons et atomes hydrogene. Ce modele dans ces conditions ne satisfait pas le besoin. Voir local-model-probe.json.
Aucun moteur conversationnel ajoute a l APK. Avant integration : mesurer un modele plus capable avec assez de memoire libre, puis tester connaissances sourcees et questions inconnues. Ne pas assimiler modele installe et moteur valide.
La compilation precedente des commandes de controle a abouti en 7m26s ; elle ne contient pas de modele de langage et reste non installee.
References techniques : https://docs.ollama.com/api/chat ; https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md

## Demande moteur directement sur telephone
Amaury autorise l installation du moteur local sur son telephone dans TEST - JULIE. Aucun service payant ni production.
Appareil ADB 40b0f1cc : arm64-v8a. Outils NDK/CMake absents du SDK controle.
Preparation dans C:/Dev/JULIE/native-engine-tools. CMake 4.4.4 archive recue et SHA256 verifie bace36e94b31c68ab6fa295f26dfa11219e0701cf7c94b0284a7d1cb13dac536 ; extraction en cours au dernier controle.
NDK r30 Windows officiel : 727980788 octets, SHA1 attendu 9bf167a1985fa7d4a036186b78f702eab9179408. Telechargement partiel 129211456 octets ; reprise HTTP Range lancee, verification complete non acquise. Ne pas compiler avec archive incomplete.
Modele candidat deja local : Qwen2.5 1.5B, blob Ollama sha256:183715c435899236895da3869489cc30ac241476b4971a20285b1a462818a5b4, taille 986048512 octets. Pas encore transfere, ni teste sur Android.
Moteur llama.cpp : source officielle https://github.com/ggml-org/llama.cpp ; HEAD observe f2cc7282ce0042641df55e0e563b75e824e2b647. Compilation puis integration native, memoire, test hors reseau et conservation apres relance restent a faire.
Aucun moteur installe sur le telephone a ce stade. Blocage actuel : acquisition outils native incomplete, debit observe environ 107 ko/s via curl.

## 2026-10-12 - Premier essai natif Android
NDK r30 complet, empreinte verifiee et extraction terminee. llama.cpp f2cc728 compile ARM64 Android 28 avec succes (llama-simple, 76 etapes, 284.52 s).
Modele Qwen2.5 1.5B, 986048512 octets, SHA256 183715c435899236895da3869489cc30ac241476b4971a20285b1a462818a5b4 verifie sur PC et telephone. Licence locale Apache 2.0 examinee.
Moteur et modele transferes dans /data/local/tmp/julie-engine-test, hors donnees applicatives.
Essai reel: distinction isotopes/isobares, prompt ChatML, 96 tokens. Chargement 2.81 s; prompt 1.96 s; generation rapportee 12.09 s, 7.94 tokens/s. Reponse tronquee a la limite, exemples insuffisants pour validation scientifique. Processus PowerShell rapporte code 1 malgre statistiques completes: verifier code adb separement et redirection stderr avant conclusion.
Preuve brute locale: phone-model-probe.log. Aucune integration native dans APK realisee a ce stade. Application TEST et originale non remplacees. Prochaine etape: essai court avec capture du code natif, puis pont JNI et sauvegarde conversationnelle.
