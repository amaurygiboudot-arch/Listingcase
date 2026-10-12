# JULIE 0.3.16 — Cohérence du dialogue et validation Android
Date : 12 octobre 2026. Statut : expérimental, installé et testé.
Dépôt : amaurygiboudot-arch/Listingcase, branche feat/julie-dialogue-coherence-20261012, issue du commit 5714255.
Source expérimentale isolée : C:\Dev\JULIE\coherence-20261012.
Les 22 décisions du document maître et JULIE_001 restent inchangées.

## Diagnostic : conversations suivies réelles avec le modèle local 3B
12 messages synthétiques, répartis dans 4 scénarios : continuité, moments fictifs, aide technique, relation. Appels natifs directement par le protocole de débogage Android, sans écrire dans la mémoire ou dans l'onglet Parler.
Défauts reproduits :
- Départ pour le travail dans une heure mal restitué au tour suivant.
- Mauvaise attribution de prénom : « Je suis là pour toi, Julie » au lieu d'Amaury.
- Confusion entre compilation Gradle et installation adb install -r.
- Demande spontanée et inutile d'adresse IP.
Les filtres précédents sur les émotions simulées, le désaccord et les faux souvenirs ont fonctionné dans les cas observés.

## Corrections implémentées en 0.3.16
1. conversation-anchors.mjs : rappel immédiat d'un projet de travail explicitement communiqué dans les 30 dernières minutes, sans créer de mémoire permanente ni inventer une activité exécutée.
2. local-conversation.mjs : applique ce rappel seulement lorsque la question le justifie, avant l'appel payant en calcul au modèle local.
3. identity-reference.mjs et dialogue-guard.mjs : correction étroite des adresses directes erronées et du surnom « Chérie » appliqué au compagnon.
4. autonomous-personality.mjs : quelques faits fiables sur Gradle, adb devices et adb install -r ajoutés uniquement au contexte d'une conversation technique Android.
5. dialogue-guard.mjs : rectification si adb install -r est présenté comme une commande de compilation et filtrage de la demande non sollicitée d'adresse IP.
6. app.mjs : marqueur de version 0.3.16.

## Contrôles sur le vrai 3B après optimisation du prompt
Trois nouvelles réponses natives fictives sans sauvegarde : le premier conseil technique mentionne correctement gradle assembleDebug et adb devices ; 11,135 secondes au total, dont 2,866 secondes avant le premier token. Une autre réponse sollicitait encore une IP : le filtre de sortie corrige ce cas. Le 3B reconnaît la possibilité d'erreurs, mais ne garantit pas une autonomie générale.

## Tests et installation
- 114 tests Node réussis sur 114, dont huit contrôles du nouveau moteur de cohérence.
- Compilation esbuild réussie, bundle de 2 021 331 octets.
- Gradle 8.9 hors ligne : BUILD SUCCESSFUL en 1 min 36 s.
- APK : C:\Dev\JULIE\packages\JULIE-TEST-0.3.16-coherence.apk ; 65 692 881 octets.
- SHA256 APK : d96b3143fe71649d0c1a8253ecb3bd7aa3e84cab15520d3a6c52ff4b791b2155.
- Identifiant Android com.julie.learning.experimental ; versionCode 300012 ; versionName 0.3.16-coherence-test.
- Même certificat Android que 0.3.15 : SHA256 668bbf6dbcc590da70a37b0102a59407a3539f0146ccf24b68c3d0f6061499c2.
- Les six bibliothèques natives comparées à la version précédente sont identiques. Modèle 3B toujours sélectionné.
- Installation Android par-dessus : Success, sans désinstallation ; application démarrée.
- 2 évolutions ADN toujours affichées, 10 références d'apprentissage visibles. Pas d'exportation du contenu des échanges privés.
- La somme SHA256 du fichier d'état chiffré a changé entre les contrôles, possiblement à la suite d'une réécriture ; l'intégrité complète n'a pas été comparée en clair. Ne pas déclarer une préservation octet par octet.

## Limites et reprise
Les sorties temporaires du streaming peuvent afficher un texte non filtré avant validation de la réponse finale. Les réponses non anticipées du modèle peuvent rester maladroites. Aucune publication production, achat, usage de minutes GitHub Actions, ni nouveau module photo.
Prochaine action : tests de dialogue avec plus de formulations, mesures de latence, puis éventuelle correction de l'affichage transitoire sans pénaliser la fluidité. Ne jamais effacer les données de la version installée et ne pas confondre ce canal avec JULIE Preview.
