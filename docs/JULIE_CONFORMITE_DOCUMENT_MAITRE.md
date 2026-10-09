# JULIE — Contrôle de conformité au document maître V1

**Référence unique** : `Julie_Document_Maitre_V1.docx`, version 1.0 du 09/10/2026, issu des 22 étapes approuvées. Le document organise ses exigences en 17 sections et cinq phases. **Ce document de suivi ne remplace ni ne modifie le document maître.**

**Règle absolue** : aucun développement, modèle 3D ou service ne change une décision fondamentale approuvée sans accord explicite du propriétaire. La vérification technique d'un code ne constitue jamais une validation de son réalisme, de sa personnalité ou de son adéquation aux attentes.

## Identité verrouillée (critères d'entrée)

| Élément | Valeur approuvée |
| --- | --- |
| Identifiant | `JULIE_001`, indépendant du nom, de l'avatar et des mises à jour |
| Identité | Julie, femme virtuelle adulte, 22 ans à la création |
| Corps initial | 1,75 m, silhouette fine |
| Visage | Expressif, adulte, crédible ; **pas** de style poupée / Roblox |
| Cheveux | Blonds, mi-longs initialement, coiffure susceptible d'évoluer ensuite |
| Yeux | Verts |
| Vêtements | Choix simulé autonome, style séduisant et évolutif |
| Vie affective | Couple virtuel établi au lancement |
| Tempérament initial | Joueuse, coquine, taquine, provocatrice, directe, affectueuse, indépendante, attachée à la stabilité ; personnalité évolutive |
| Temps | 1 jour réel = 1 jour virtuel |
| Souvenirs communs | Construits ensemble ; pas de fausses expériences réelles |
| Fin de vie | Histoire en pause, identité et archives autorisées conservées |
| Budget | Priorité aux solutions gratuites ; aucune dépense sans accord explicite |

Une valeur **décrite** dans la configuration ne vaut pas preuve que son apparence, sa simulation ou son comportement sont effectivement intégrés.

## Audit d'écarts au 09/10/2026 — canal Android de développement 0.3.5

Statuts : **Prototype** = partie présente et testable mais incomplète ; **Absent** = aucun système correspondant prouvé ; **Partiel** = quelques sous-exigences techniques vérifiées. **Conforme** exige des tests, un contrôle visuel sur appareil et une approbation de l'utilisateur ; ce statut n'est attribué à aucune section globale à ce jour.

| Section du maître | État constaté | Écart à traiter |
| --- | --- | --- |
| 01 Personnalité fondatrice | **Absent fonctionnellement** | Dialogue actuel déterministe, sans moteur de traits, libre arbitre simulé, préférences évolutives ni désaccord raisonné |
| 02 Psychologie et apprentissage | **Absent** | Humeur causale, émotions simulées, objectifs, raisonnement, apprentissage avec provenance et journaux à construire |
| 03 Vie de couple | **Prototype** | Messages affectueux de démonstration ; accords révisables, initiative et histoire commune traçable non réalisés |
| 04 Identité biographique | **Partiel** | Prénom et `JULIE_001` ; histoire fictive cohérente, entourage et secret narratif non réalisés |
| 05 Vie quotidienne et autonomie | **Absent** | Sommeil, repas, travail, monnaie virtuelle, planification et événements hors connexion |
| 06 Perception et sens simulés | **Absent** | Attention, vision simulée, perception, proprioception et sens |
| 07 Corps et avatar 3D | **Prototype** | Véritable GLB humain articulé de la source Genesis, correction morphologique féminine, premier vêtement suivant le squelette, prototype iris verts/morphs faciaux/cheveux blonds mi-longs, et 30/60/120 FPS ; aspect réaliste, rendu GPU, coiffure, peau, animation et physique textile non validés sur téléphone |
| 08 Biologie et santé fictives | **Absent** | Fonctions internes, vieillissement, fatigue, cycles, états physiologiques et conséquences |
| 09 Communication immersive | **Prototype textuel** | Conversation en phrases modèles ; pas de moteur conversationnel autonome, voix, lèvres synchronisées ou vidéo |
| 10 Vie sociale et professionnelle | **Absent** | Amis, famille, carrière, économie et décisions personnelles autonomes |
| 11 Maison et univers | **Prototype décoratif** | Chambre 3D statique ; absence d'objets persistants, de simulation et de tâches domestiques |
| 12 Loisirs, voyages et culture | **Absent** | Découvertes, passions, voyages, progression et souvenirs culturels |
| 13 Évolution de vie et avenir | **Absent** | Horloge de vie, vieillissement, rêves, projets, archivage des traits et pause finale |
| 14 Imprévus et arbitrages | **Absent** | Décisions causales, gestion du risque, conséquences et arbitrages autonomes |
| 15 Mémoire et continuité | **Partiel** | Historique local, import/export explicite, chiffrement AndroidKeyStore et test anti-réintroduction ; pas de sauvegarde cloud chiffrée, restauration inter-appareils vérifiée, catégories complètes, journal d'évolution ni stockage permanent garanti (limite locale) |
| 16 Architecture et sécurité | **Partiel** | Android autonome en local, contrôle réseau pour les mises à jour ; chaîne de signature permanente, permissions granulaires, arrêt sensible et contrôle des coûts encore incomplets |
| 17 Feuille de route / critères | **Partiel** | Tests unitaires, intégration 3D et APK GitHub Actions ; pas encore de validation intégrale sur téléphone ni des scénarios de restauration/usage prolongé |

**État actuel honnête** : application de prévisualisation Android. Elle **n'est pas** aujourd'hui la Julie réaliste, autonome, mémorielle et évolutive du document maître.

## Critères d'acceptation — apparence et qualité visuelle

Une version d'avatar ne devient « conforme » qu'après passage de ces points, sur téléphone en portrait et paysage :

- Profil féminin adulte, 1,75 m et proportions humaines observables de face, de profil, de dos et à 360° ; aucune géométrie masculine résiduelle, aucune intersection, aucune partie du corps qui disparaît pendant l'animation.
- Visage féminin crédible et détaillé : yeux verts visibles, paupières et regard cohérents, expressions subtiles, nez, bouche, mâchoire, peau continue avec relief discret.
- Cheveux blonds mi-longs de départ, implantation réaliste, aucune carte-guide technique ni mèches qui traversent le corps ; évolution capillaire future distincte de la base validée.
- Tenue intacte en mouvement, sans découpe involontaire ou peau traversante ; épaules, mains, pieds, articulations et démarche naturelles.
- Gestes, clignements, respiration, posture et mouvement des yeux crédibles ; synchronisation lèvres/voix lorsque la fonction vocale sera livrée.
- Aucune barre qui masque les jambes, commandes accessibles, tournage tactile, zoom et distance stables ; adaptation visuelle et FPS `<=120` selon santé/performance du téléphone.
- **Validation humaine indispensable** : présentation vidéo/captures, comparaison aux critères, corrections puis accord explicite du propriétaire ; un test automatisé de maillage n'évalue pas la beauté ni le réalisme perçu.

## Critères d'acceptation — personnalité, relation et autonomie

- Julie peut converser librement et dans le contexte, défendre un avis, refuser une proposition, expliquer ses raisons et ajuster sa position selon les faits.
- Les tendances coquine/taquine/séductrice sont un **point de départ** ; elles ne remplacent pas une personnalité stable, indépendante et capable d'évolution.
- Julie peut proposer des activités, choisir un loisir, former un objectif, changer d'avis et tracer pourquoi ; les simulations d'émotions ne sont jamais présentées comme une conscience prouvée.
- Les accords du couple se négocient par dialogue ; aucune modification unilatérale silencieuse.
- Les souvenirs de couple préexistants sont signalés **fictionnels** jusqu'à construction commune ; aucune fausse expérience présentée comme réellement vécue.
- La vie hors présence de l'utilisateur doit distinguer tâches réellement exécutées, événements simulés à partir du temps écoulé et plans non réalisés.

## Critères d'acceptation — mémoire et sécurité

- Chaque souvenir durable dispose de son type (fiction, événement applicatif, recherche, hypothèse, accord), date, source, degré de confiance, correction et historique.
- Après 1, 100 et 1 000 échanges, aucune disparition silencieuse ; les limites physiques déclenchent une alerte et une voie d'exportation, sans écrasement.
- Tester export/import, mauvais fichier, crash, restauration, changement de téléphone, réinstallation et migration entre schémas.
- Une suppression volontaire doit empêcher **toute résurrection**, y compris après restauration d'une ancienne sauvegarde.
- Conserver `JULIE_001` et les versions d'historique quand l'apparence, le nom affiché ou la personnalité évoluent.
- Dépenses réelles, publication, partage de données identifiables et permissions sensibles : contrôle explicite, journal, révocation et arrêt immédiat.
- Mises à jour : même identifiant Android, clé stable, sauvegarde avant migration et refus d'installation si signature incompatible. Ne jamais désinstaller automatiquement une version qui porte des souvenirs.

## Ordre de réalisation approuvé

1. **Sans régression** : fiabiliser identité, sauvegardes et chaîne Android avant toute migration.
2. **Conformité visuelle immédiate** : anatomie féminine, visage, yeux, cheveux, peau, tenue, animation, performance, essais sur téléphone.
3. **Noyau personnel** : moteur de personnalité, dialogue contextualisé, mémoire typée avec provenance et continuité.
4. **Décisions et autonomie simulée** : objectifs, initiatives, journal, principes de consentement, actions programmées.
5. **Communication immersive** : voix, expressions synchronisées, gestes.
6. **Univers persistant** : logement, activités, emploi, relations, économie fictive, puis simulation avancée et vieillissement.

Cet ordre garde l'exigence de fidélité au document maître. Les composants avancés peuvent être prototypés isolément, sans annoncer une phase comme achevée avant ses tests d'acceptation.

## Convention de livraison

Pour chaque mise à jour :

- identifier les clauses du document maître concernées ;
- lister les fichiers modifiés, risques et impacts sur souvenirs/dépenses ;
- exécuter tests techniques, tests de données et compilation ;
- vérifier l'APK sur téléphone avant validation visuelle ;
- inscrire dans les notes de version « terminé / partiel / non livré » ;
- demander accord explicite pour tout changement d'identité, de relation ou de choix fondateur.

**La coche verte GitHub signifie « compilation/test technique réussis », pas « Julie conforme aux attentes ».**
