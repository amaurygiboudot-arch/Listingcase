# JULIE — Deuxième source documentaire V0.3

Date : 10 octobre 2026
Branche de développement : feat/julie-scientific-sources-20261010
Base : commit fbd7c35 du prototype de recherches programmées.
Référence maîtresse : document maître JULIE V1.0 (02, 15, 16, phase 2), sans modification des 22 décisions.

## Objectif concret
Fournir à l'application Android JULIE_001 deux références documentaires indépendantes pour certains sujets de biologie/chimie, sans les déclarer automatiquement vraies. La prochaine étape sera une confrontation du contenu, encore absente.

## Ajouts techniques
- Source primaire existante : résumé de l'encyclopédie Wikipédia francophone, soumis à vérification, récupéré depuis le service Android.
- Source complémentaire : Europe PMC, service public de recherche bibliographique de l'EMBL-EBI (https://europepmc.org/RestfulWebService).
- Sélection de thèmes limités préconfigurés. Une requête supplémentaire est possible lorsque Europe PMC traite le domaine ; pour gravitation et cycle de l'eau, pas de deuxième recherche bibliographique générique.
- Recherche limitée à un article librement accessible : titre, année, URL de notice et court fragment de résumé quand fourni. La simple existence d'une publication sur un sujet ne valide PAS l'affirmation du premier texte.
- Domaines fixes : fr.wikipedia.org et www.ebi.ac.uk pour les requêtes ; références conservées avec URL d'origine, attribuées à Europe PMC et à l'article encyclopédique.
- Validation stricte avant intégration : fournisseur Europe PMC, URL HTTPS de notice, chemin /article/MED ou /article/PMC, année, longueur des champs.
- Les données non validées restent au statut de pistes documentaires ; confiance 0,1 inchangée.
- La mémoire anti-résurrection, l'identifiant JULIE_001 et la file native chiffrée sont préservés.
- Les titres et URL sont affichés dans Souvenirs > Apprentissage local, sans injection de HTML externe.

## Limites
- Aucun système automatisé de lecture critique, de comparaison des affirmations ni de détection de contradictions entre textes n'est encore validé. Deux sources ne signifient pas que les faits sont confirmés.
- Europe PMC couvre surtout les sciences de la vie ; certaines recherches peuvent ne retourner aucune notice appropriée.
- JobScheduler réalise la collecte au mieux selon les contraintes d'Android, d'énergie et de réseau non facturé ; aucune exécution sur téléphone n'a été confirmée.
- La couche conversationnelle ne sait pas encore raisonner sur le corpus collecté.
- L'application n'entraîne pas de nouveau modèle d'IA.
- Aucun paiement, service payant ni partage des messages/souvenirs personnels.

## Vérifications
- Europe PMC /search testé depuis EDUCTOR sur le thème photosynthesis : résultat JSON comportant métadonnées bibliographiques.
- 9 tests du module research-autonomy, comprenant les 3 tests de seconde source : réussis.
- 23 tests regroupés d'apprentissage, mémoire et recherche : réussis.
- Compilation Java via javac sur Android SDK 35 : réussie (source originale + classe Europe PMC).
- Compilation de l'APK complète incluant bundle JS et modèle 3D : non confirmée.
- Tests Android instrumentés et exécution hors ouverture de l'application : non réalisés.
- Aucun changement de document maître et aucune fusion, publication ou installation effectuée.

## Suite proposée
1. Compiler et inspecter l'APK complète dans un environnement isolé dès que le bundle JS est disponible.
2. Vérifier mémoire chiffrée, réseau non facturé, tâches différées et effacement sur téléphone.
3. Construire une véritable confrontation des propositions entre plusieurs sources, marquer contradictions et limites.
4. Relier ce corpus au moteur de raisonnement et à la prise d'initiative de JULIE.
