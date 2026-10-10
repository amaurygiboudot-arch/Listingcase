# JULIE — Noyau d'apprentissage Android V0.1 (prototype local)

Date : 10 octobre 2026
Références : document maître JULIE V1.0 (sections 02, 15, 16, phase 2) ; protocole d'apprentissage V0.1 sur Google Drive.
Identité : JULIE_001 inchangée.
Branche de travail : feat/julie-learning-core-20261010, créée depuis le correctif de fusion mémoire fix/julie-memory-import-20261009.
Périmètre : julie-v3-genesis (canal Android existant), sans modifier Human Partner, Genesis ni le document maître.

## Livré dans les sources locales de développement
- www/learning-engine.mjs : stockage structuré des connaissances, provenance, questions embarquées, suivi des tests, erreurs et corrections.
- www/state-store.mjs : conservation du nouveau champ learning dans le stockage existant ; prise en charge des anciens exports et fusion avec règles anti-résurrection.
- www/app.mjs et www/index.html : onglet Souvenirs enrichi d'un panneau Apprentissage local avec affichage, révision de règle et suppression volontaire.
- tests/learning-engine.test.mjs : tests de migration, révision, erreur et correction, import/export, refus des données malformées et suppression.

## Sécurité et vérité de fonctionnement
- Les connaissances sont incluses dans le JSON déjà chiffré via AndroidKeyStore par JulieSecureStore ; le code Java de stockage n'est pas modifié.
- L'export JSON explicite reste en clair : il doit rester privé.
- Les vieux exports ne doivent pas faire revivre les apprentissages effacés lors d'une fusion ; une suppression désactive également les séances locales pour éviter une réintroduction automatique.
- Les références sont EMBARQUÉES, préexistantes. Le moteur n'a pas consulté directement les pages Web depuis l'APK. Il ne faut pas appeler cela une recherche scientifique autonome.
- Une question est préparée au démarrage au plus une fois par jour UTC. Aucune tâche n'est exécutée lorsque l'APK est fermée.
- Les « tests » vérifient seulement des règles déterministes dans un domaine limité (hydrogène, hélium). Ils ne démontrent ni entraînement d'un modèle ni intelligence autonome générale.
- Les erreurs réellement constatées sont gardées avec la preuve et le statut de vérification ; les corrections requièrent une source et un test ultérieur.
- Les données réelles de l'utilisateur et la mémoire de couple restent distinctes de cette base de connaissances.
- Le stockage reste plafonné à 8 Mo comme auparavant : en cas de saturation, aucune purge automatique silencieuse.

## Vérifications exécutées
- Avant changements : 6 tests du stockage existant réussis.
- Après changements : 14 tests ciblés (apprentissage + stockage existant) réussis.
- Après changements : 36 tests du sous-projet julie-v3-genesis réussis.
- Tests de syntaxe JavaScript exécutés sur les fichiers de travail.
- Tests sur appareil Android : NON réalisés.
- Compilation APK / signature / distribution : NON réalisées.
- Vérification visuelle de l'interface : NON réalisée.
- Source modifiée uniquement dans la copie de travail sur EDUCTOR ; pas de fusion GitHub ni de déploiement confirmé.

## Étapes suivantes
1. Compléter un contrôle de rendu WebView et une compilation APK dans le workflow officiel, sans changer l'identifiant Android ni la clé de signature.
2. Faire valider les données et la conservation des souvenirs par import/export sur appareil réel.
3. Introduire une véritable source d'information fiable et une vérification critique, sans dépendance à une API payante par défaut.
4. Ajouter un moteur d'exécution différée Android fiable (WorkManager ou équivalent après vérification des contraintes), avec consentement réseau, quotas, journal d'exécution et gestion des interruptions.
5. Tester rappel différé, nouvelles questions, détection de contradictions, restauration, suppression définitive et non-régression.
6. Développer ultérieurement la couche de raisonnement et le dialogue contextualisé à partir de ces connaissances, sans confondre mémoire documentaire et apprentissage d'un modèle.

Cette note est un journal de développement. Aucune phase du document maître n'est déclarée terminée.
