# Féminin et délai de réponse — 12 octobre 2026

## Changements installés dans JULIE TEST
Consigne explicite : femme virtuelle adulte, accords au féminin avec exemples contente/prête/heureuse. Réponses demandées en une ou deux phrases.
Le modèle reçoit encore quatre messages récents, avec extraits de 160 caractères par message au lieu de 400. Aucun historique stocké n'est raccourci ou supprimé. Cette réduction peut limiter la compréhension des détails anciens.
SCI-003 n'est fournie qu'aux échanges scientifiques pertinents et aux examens ; les échanges ordinaires n'encombrent plus leur contexte avec ces règles.

## Processeur
Les indicateurs asimddp et asimdhp ont été lus sur le téléphone 40b0f1cc.
Le backend ggml-cpu a été recompilé avec GGML_CPU_ARM_ARCH=armv8.2-a+dotprod+fp16. Les contrôles de compilation DOTPROD et FP16 ont réussi.
Seul le backend CPU a cette exigence spécifique. Cette APK de test est destinée au téléphone vérifié ; ne pas la distribuer comme un binaire universel.
Ancienne bibliothèque portable conservée dans C:/Dev/JULIE/native-engine-tools/libggml-cpu-portable.so.
tools/build-native-engine.ps1 accepte -RedmiOptimized et vérifie les indicateurs CPU ; sans option, compilation portable explicite.

## Mesures et preuves
Même prompt de 58 tokens, même modèle, CLI sur le même téléphone :
- portable : traitement du prompt 2860,04 ms (20,28 tokens/s), génération 10,49 tokens/s ;
- optimisé : traitement du prompt 1198,16 ms (48,41 tokens/s), génération 10,93 tokens/s.
Les réponses diffèrent légèrement entre les compilations ; la qualité générale reste expérimentale.

Test UI après consigne au féminin, avant optimisation CPU :
« Je suis contente et prête à discuter avec toi. »
Premiers mots 10268,8 ms ; réponse complète observée 12870,9 ms.

Test UI final après optimisation CPU :
« Oui, je suis contente et prête à discuter avec toi. »
Premiers mots 6171,2 ms ; réponse complète observée 8639,2 ms.
5 mises à jour progressives ; 159 ticks de la boucle UI.
Ces tests UI utilisent l'historique réel, qui évolue entre les essais ; ils ne constituent pas une comparaison strictement contrôlée. La mesure CLI ci-dessus utilise la même entrée.

8 tests ciblés réussis : contexte compact, consigne féminine, routage scientifique, erreurs du pont, réponses progressives, examens.
Compilation et installation réussies.
40 messages préexistants strictement conservés ; 42 après le test. Souvenirs et résultats d'examens inchangés. Réponse finale conservée après arrêt forcé et relancement de l'application.
Données chiffrées identiques avant/après installation :
ac3545ad43d1d5f3d5dc6deca8aec6f78cc56b5ed88d79df3ea60b2934f1cadc.
APK final SHA256 :
653c79a50af4e71047c7c3a938bcc6317b7f5b36a4830c21c33fb48346f52ea2.

## Limites
Le premier échange prend encore plusieurs secondes ; aucune promesse de réponse instantanée.
Le respect du féminin est démontré sur les tests effectués, pas garanti pour toute formulation.
Le modèle peut encore se tromper sur les connaissances, notamment les isobares.
Document maître et décisions inchangés ; pas de publication ni de dépense.
