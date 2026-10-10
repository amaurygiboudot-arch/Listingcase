# JULIE — Recherche documentaire autonome Android V0.2

Date : 10 octobre 2026
Statut : prototype en branche locale, non livré à l'utilisateur
Branche : feat/julie-background-research-20261010
Base préservée : feat/julie-learning-core-20261010, commit 6ef4af7
Fondements du document maître : sections 02, 15, 16, phase 2. Aucune décision fondatrice modifiée.

## Rôle de cette étape
Permettre à la véritable application Android JULIE_001 de consulter périodiquement une source publique sans ChatGPT et sans laisser l'application ouverte, puis conserver une piste documentaire dans la mémoire locale après vérification de l'écriture. Ce composant n'est pas un modèle entraîné, un moteur de recherche scientifique exhaustif, ni un moteur conversationnel autonome.

## Exécution et ressources
- Service natif JulieResearchJobService basé sur Android JobScheduler, tâche récurrente best-effort environ toutes les 24 h.
- Job Android persistant aux redémarrages avec permission RECEIVE_BOOT_COMPLETED ; Android peut décaler ou ignorer l'exécution selon batterie, optimisation et réseau.
- Seul un réseau non facturé / Wi-Fi est accepté, avec contrainte batterie non faible.
- Sujet choisi à partir d'un cycle limité de thèmes scientifiques, sans envoyer de conversation, de souvenir, d'identifiant privé ni de question personnelle.
- Domaine fixe : fr.wikipedia.org ; HTTPS obligatoire, redirections refusées, réponse JSON bornée à 48 Ko ; 10 s de délai de connexion/lecture.
- API MediaWiki Action : prop=extracts, exintro, explaintext ; un extrait maximal de 900 caractères, URL et date d'accès enregistrées.
- Source unique de type encyclopédie collaborative ; étiquette « à corroborer » et confiance faible. Les extraits ne deviennent jamais silencieusement des faits scientifiques confirmés.
- Source documentaire facultative, sans API commerciale ni paiement.

## Mémoire et suppression
- File native chiffrée distincte du JSON conversationnel, utilisant AES-GCM et AndroidKeyStore existants.
- Maximum 12 entrées en file. Aucun effacement automatique des plus anciennes si la file est pleine.
- À l'ouverture de l'APK, les extraits sont importés dans learning après validation du domaine, de l'URL, des champs, de la taille et de la date.
- Chaque fiche nouvelle conserve source, titre, texte, statut incertain, date et journal d'arrivée. Les doublons sont rejetés.
- Après écriture réussie du JSON principal, l'application accuse réception à la file native ; avant cet accusé, la file reste conservée.
- Toute suppression volontaire efface l'apprentissage, désactive les tâches planifiées et demande la purge de la file. Une sauvegarde ancienne ne doit pas ressusciter les entrées volontairement supprimées.
- L'export manuel JSON reste NON chiffré : prévenir explicitement l'utilisateur.
- Identité JULIE_001 et historique des messages non modifiés.

## Interface Android
Dans Souvenirs > Apprentissage local :
- un interrupteur permet d'activer ou arrêter la recherche documentaire en Wi-Fi ;
- un bouton permet de demander un travail ponctuel soumis au quota de 6 heures ;
- les pistes importées sont affichées avec l'attribution et la source ;
- les tests de règles hors ligne restent distincts des recherches non corroborées.

## Validation et blocages connus
- Réponse JSON réelle de l'API Wikimedia « Liaison chimique » observée sur EDUCTOR en lecture seule.
- 20 tests ciblés du module d'apprentissage et de mémoire vérifiés.
- 42 tests du sous-projet JULIE V3 vérifiés.
- Classes Java de stockage et service compilées avec javac et Android SDK 35.
- Gradle 8.9 hors ligne : tâche :app:compileDebugJavaWithJavac réussie dans une copie isolée, après renseignement du chemin SDK.
- Compilation APK complète, tests Android instrumentés, rendu WebView et exécution sur téléphone : NON vérifiés.
- Aucun commit poussé sur GitHub, aucune PR fusionnée, aucune APK publiée ou installée à ce stade.
- L'apprentissage reste documentaire et simulé, pas une mise à jour des poids du modèle.
- Les contenus externes sont non fiables jusqu'à confrontation avec des sources scientifiques indépendantes.

## Prochaines étapes
1. Réaliser une compilation APK complète dans le workflow officiel, puis vérifier la signature, l'identifiant et la compatibilité avec les anciennes données.
2. Vérifier sur appareil : JobScheduler, persistance chiffrée et accusé de réception, arrêt, réseau facturé, effacement, import ancien.
3. Ajouter un second fournisseur scientifique institutionnel et un mécanisme de confrontation, sans supposer que Wikipedia suffit.
4. Introduire moteur de compréhension/questions personnelles simulées et journal de décisions, puis dialogue qui s'appuie sur des faits recoupés.
5. Préserver la chaîne d'APK signée avec l'identifiant stable, sans réinstallation destructrice.
