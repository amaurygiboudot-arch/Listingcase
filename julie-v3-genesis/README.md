# JULIE — canal Android de développement (0.3.5)

**Source active sur `julie-v1`** : `julie-v3-genesis/`. Le nom du répertoire est hérité du premier prototype Genesis ; il n'implique pas la création d'une nouvelle APK à chaque mise à jour.

## Fonctionnement vérifiable
- Identité immuable **JULIE_001**, modèle femme adulte de base issu de la même ressource MakeHuman / MPFB CC0 que Genesis.
- Squelette et animation inclus dans le GLB, scène 3D hors ligne, plafond FPS économique 30, normal 60, élevé 120.
- Chat **hors ligne déterministe** : pas encore d'IA conversationnelle ni de mémoire cloud.
- Android WebView à ressources locales, origine HTTPS simulée par interception locale ; **aucun JavaScript distant dans la WebView**.
- Le gestionnaire natif JulieUpdateManager possède une permission Internet limitée dans son code à l'API GitHub Releases et au téléchargement d'une APK depuis notre dépôt public. L'application peut vérifier les nouvelles versions à l'ouverture (au plus une fois par jour), les télécharger automatiquement via réseau non facturé, puis proposer l'installation avec confirmation Android.
- Vérification stricte du tag GitHub dédié, du nom d'APK, du SHA-256, de la taille, de la version, de l'identifiant Android et du certificat de signature avant la proposition d'installation.
- Android exige de confirmer l'installation, même après un téléchargement automatique. Les appareils Android hors Google Play peuvent demander d'autoriser Julie à installer des applications.
- Journal des messages et souvenirs de démonstration sans troncature silencieuse ; plafond physique de 8 Mo vérifié avant écriture.
- Stockage privé Android **AES-256-GCM via AndroidKeyStore** ; une ancienne mémoire V3 enregistrée en clair est migrée uniquement après enregistrement chiffré confirmé.
- Export JSON explicite **non chiffré**, import validé et fusionné sans écraser le courant. Effacement horodaté : les anciens exports ne peuvent pas recréer silencieusement les éléments supprimés.
- Toute erreur de stockage refuse de remplacer l'ancien état. Les données de Genesis/Ève ne sont ni copiées ni modifiées.

## Source unique et compilation
Un seul workflow à utiliser pour les prochaines versions : `.github/workflows/julie-android.yml`.
Les anciens workflows et les anciennes versions doivent être considérés comme des archives/prototypes, à retirer uniquement après preuve du bon fonctionnement du nouveau canal.

Paquet Android de développement : `com.julie.preview.v3` (inchangé par rapport à Julie V3), version 0.3.5. **Signature** : tant qu'une clé Android privée et persistante n'est pas configurée dans GitHub Actions, l'APK de test reste signée avec une clé debug propre au runner. L'installation par-dessus l'ancienne peut alors être refusée. **Exporter les souvenirs avant toute désinstallation** puis importer volontairement l'export JSON. Une désinstallation efface la mémoire chiffrée AndroidKeyStore.

### Flux des mises à jour
- Source de mise à jour : `https://api.github.com/repos/amaurygiboudot-arch/Listingcase/releases/tags/julie-android-updates`.
- Dans Réglages, case de téléchargement automatique en Wi-Fi (désactivable), « Vérifier maintenant », puis « Installer avec Android » après contrôle.
- La Release GitHub doit contenir un seul fichier `JULIE-Android.apk`, avec métadonnées JSON de version/empreinte. **Aucune mise à jour ne sera proposée avant sa publication.**
- Pour publier des mises à jour compatibles, une **clé de signature Android stable** doit être enregistrée dans les secrets GitHub Actions. Ne jamais publier la clé dans le dépôt ou les logs, et ne jamais insister sur une installation si la signature diffère.
- Après une première migration contrôlée depuis l'APK de test à signature temporaire, les futures versions signées avec la même clé pourront s'installer sans effacer le stockage privé Android.

## Correctif du modèle à partir de la vidéo (0.3.4)
- Suppression des **quatre coquilles de construction** du fichier MakeHuman/MPFB qui faisaient apparaître le bas du corps sous la forme d'une fausse jupe couleur peau.
- Le nettoyage ne retire que les indices de triangles vérifiés sur la topologie connue ; maillage corporel, UV, animation, morph targets et poids du squelette sont préservés.
- Le workflow teste cette opération sur le **vrai GLB de Genesis** et échoue si les résultats ou la topologie ne correspondent plus.
- L'information de chargement se masque après quelques secondes afin de laisser les jambes visibles pour l'inspection.
- Le visage, les cheveux, les vêtements physiques et les mouvements réalistes avancés restent à développer ; la correction doit être validée visuellement sur Android.


## Recherche autonome limitée : Wikipédia, test Android (12 octobre 2026)
- L'ancienne API Google Custom Search JSON n'accepte plus de nouveaux clients (annonce Google du 20/01/2026). Ne jamais simuler une intégration à Google ni contourner ses restrictions. Les demandes **explicites Google** ouvrent son site dans le navigateur.
- Pour une demande générique « Julie, cherche… », le pont Android appelle l'API publique officielle MediaWiki (`fr.wikipedia.org/w/api.php`, module `query&list=search`) et retourne au maximum trois résultats dans le dialogue, avec des liens et l'indication que la source n'a pas été recoupée.
- Aucun service payant, aucune clé API, aucune donnée de conversation envoyée au service : uniquement le texte de recherche. Stockage distinct des souvenirs, réponse issue de résultats réels et message d'échec si réseau indisponible.
- Résultats vérifiés sur EDUCTOR : API Wikipédia HTTP 200 ; 43/43 tests JavaScript réussis ; build Android Gradle réussi avec modèle 3D et modules embarqués.
- APK isolée `com.julie.research.preview`, versionCode 2, `0.3.5-research-auto-test.2`, installée par `adb install -r` avec résultat Success. L'application a été lancée, `MainActivity` visible sur Redmi. Les autres installations `com.julie.learning.experimental`, `com.humanpartner`, `com.julie.preview.v3` sont restées installées.
- L'interaction réelle avec Wikipédia **depuis l'application sur le téléphone** n'a pas encore été validée de bout en bout par un essai utilisateur ; les tests établissent le code, le serveur accessible depuis EDUCTOR, la compilation et le lancement Android, pas la qualité de toutes les réponses.
- Aucun moteur Qwen raccordé à cette version isolée, aucune exploration générale Google automatisée ; le système renvoie des extraits, pas une synthèse raisonnée par un grand modèle de langage.

## Lecture Web directement depuis la conversation — expérimental
- Si l'utilisateur envoie explicitement une adresse HTTPS publique dans une conversation, JULIE appelle son lecteur natif puis affiche un extrait et l'URL directement dans le dialogue, sans passage par l'onglet Rechercher.
- Une recherche Google par mots-clés ouvre toujours le navigateur externe. Cette évolution ne constitue **pas** une récupération autonome des résultats Google ni une intégration à Qwen.
- La source lue est étiquetée non vérifiée et enregistrée séparément des souvenirs et déclarations personnelles. En cas d'erreur réseau, JULIE ne prétend pas avoir lu la page.
- Tests JavaScript du projet : 40/40 réussis sur EDUCTOR avant ajout du test de sauvegarde de réponse ; test ciblé de cette réponse ajouté et réussi. Compilation Android de la révision précédente 0.3.5-dev.google-research réalisée et signée en debug localement. La révision suivante reste à construire et inspecter indépendamment.

## Recherches issues de ChatGPT — format d’échange JULIE (12 octobre 2026)
- Bibliothèque commune de **connaissances importables**, mais pas de lecture automatique de l'historique du compte ChatGPT : aucune API de synchronisation ni permission implicite. La source de chaque recherche doit être conservée.
- Dans ChatGPT, préparer volontairement un compte rendu **JSON** puis le coller dans l'onglet **Rechercher** de JULIE. Exemple minimal :
```json
{"type":"julie.research.v1","origin":"chatgpt","title":"Sujet documenté","summary":"Résumé des éléments établis et des incertitudes.","sources":[{"title":"Référence","url":"https://example.org/article"}]}
```
- Les recherches importées sont horodatées à l'import, marquées **non vérifiées dans JULIE** et séparées des souvenirs, des messages et des recherches Web natives. Elles sont incluses dans les exports/imports chiffrés au repos sur Android et dans les protections anti-restauration après effacement.
- Les conversations privées, les données bancaires ou les secrets ne doivent pas être copiés automatiquement. La source et les licences des documents doivent être respectées.
- Les imports ChatGPT ne garantissent pas l'exactitude du résumé. Les pages Web individuelles doivent être vérifiées indépendamment.
- La synchronisation entièrement automatique entre toutes les conversations ChatGPT et JULIE reste **non développée** et ne doit jamais être annoncée comme active.
- Les recherches Google, ChatGPT et les apprentissages locaux peuvent apparaître dans le bilan quotidien, à condition d'avoir réellement été enregistrés.

## Journal d'apprentissage local — étape expérimentale (12 octobre 2026)
- Chaque échange reste dans l'historique existant. Un journal séparé conserve seulement les déclarations explicites et corrections de l'utilisateur (non vérifiées automatiquement), avec date et provenance.
- La question « Julie, qu'as-tu appris aujourd'hui ? » reçoit directement dans le dialogue un bilan des éléments explicitement enregistrés ce jour-là et des sources Web enregistrées. En l'absence de nouvelles entrées, JULIE le dit sans inventer.
- Journal intégré aux exports/imports et effacements, sans restauration d'éléments supprimés depuis un ancien export.
- Le modèle Qwen réel, l'analyse sémantique avancée de *toutes* les conversations et la recherche Google entièrement autonome ne sont **pas** encore raccordés à cette prévisualisation. Il s'agit d'un prototype local, pas d'une intelligence autonome livrée.

## Recherche Google.com — développement séparé (12 octobre 2026)

Décision : **Google.com est le moteur principal** de recherche JULIE. Cette intégration est développée sur `feature/julie-google-research-20261012`, à valider avant toute fusion dans `julie-v1`. La version **TEST** avec Qwen 3B n'est ni modifiée ni remplacée. Les deux APK restent distinctes jusqu'à identification/contrôle des identifiants de paquet et signatures.

- L'onglet **Rechercher** ouvre `https://www.google.com/search?q=...` dans le **navigateur Android externe**, pas dans la WebView contenant le stockage chiffré.
- Une commande explicite dans le dialogue « Cherche sur Google ... » prépare également cette ouverture.
- L'utilisateur peut copier l'adresse HTTPS d'une page choisie depuis Google puis la transmettre à l'onglet Recherche. Le code natif lit **du texte public HTTPS seulement**, sans exécuter de JavaScript distant ; aucune redirection automatique, timeout, limitation de taille, vérification préalable des adresses réseau non publiques.
- L'utilisateur peut enregistrer explicitement une **information recherchée** datée et sourcée, marquée « non vérifiée », séparée des messages et souvenirs. Les exports/imports et l'effacement incluent désormais ce registre, avec barrière contre la réintroduction après effacement.
- Aucune API Google payante, aucun abonnement, aucune clé secrète et aucune extraction automatisée des résultats Google.com. Au 12/10/2026, la Custom Search JSON API Google n'accepte plus de nouveaux clients : il serait trompeur de promettre une recherche Google.com entièrement autonome avec cette méthode. Cette étape apporte un accès utilisateur à Google et un lecteur de pages, **pas encore un agent général autonome ni une intégration Qwen**.
- Les pages protégées, fortement dynamiques, bloquant les robots ou les redirections peuvent être illisibles. Aucune réponse ne doit être présentée comme vérifiée sur la seule base d'une page.

### Contrôles obligatoires avant installation

1. Tests unitaires `node --test julie-v3-genesis/tests/google-research.test.mjs` et tests mémoire existants ; vérification de la syntaxe JS.
2. Compilation Android avec `JulieWebResearch.java` copié via le workflow unique, puis examen des journaux et tests sur téléphone.
3. Sauvegarde/export des souvenirs avant remplacement d'une APK de signature inconnue ; ne jamais désinstaller l'ancienne installation sans migration vérifiée.
4. Confirmer la version installée, les deux paquets et leur rôle avant publication ; mettre à jour le document maître Google Drive après contrôle.

## Limites importantes
Cette application n'est pas une compagne pleinement autonome, ne possède pas de voix, de synchronisation sécurisée ni de monde persistant. Le corps utilise la même source GLB humanoïde que Genesis et seulement une première morphologie féminine adaptée : l'apparence exacte d'Ève (cheveux, yeux, texture peau, animations et morphs avancés) est encore à intégrer et doit être contrôlée visuellement.

## Sécurité et coût
Pas d'abonnement, pas de paiement, pas d'appel à une API payante, pas d'accès à un compte sensible. Les échanges de Julie ne sont jamais envoyés à GitHub par le gestionnaire de mises à jour. Les journaux GitHub Actions ne doivent jamais contenir de souvenir personnel ou de clé de signature. Aucun changement aux branches `main` ou `backup-human-partner-20261009`, ni au dépôt Genesis, dans ce canal.

Références : `Julie_Document_Maitre_V1.docx` (document de conception approuvé), `CREDITS_MODELE.md` (provenance et licence GLB).

## Prototype visage et cheveux — version 0.3.5
- Pupilles et iris verts traités sur les deux globes oculaires du GLB réel, sans ajouter de fausses sphères.
- Trois micro-expressions par morph de la peau : clignement, sourire discret et hausse des sourcils ; léger mouvement de tête après la pose d'animation.
- Première chevelure blonde mi-longue ancrée sur les sommets du crâne skinné et l'os de la tête, avec de légers mouvements des pointes. Pas encore de physique capillaire complexe ni de pousse simulée.
- Les modules échouent si la topologie du visage/chevelure de Genesis ne correspond pas aux repères vérifiés. Les tests sur le GLB réel et la compilation Android ne prouvent pas le photoréalisme ; validation visuelle sur téléphone encore indispensable.
- Conservation du même package Android, de la même identité et des souvenirs existants : aucune migration de mémoire requise par ce changement de scène 3D. Signature Android permanente toujours préalable aux mises à jour en place.

## Contrôle qualité du rendu (0.3.5, correctif)
- Capture automatique Chromium avec WebGL logiciel ajoutée au workflow unique.
- La première capture a révélé des mèches hérissées et un matériau de construction sombre sur les membres ; les tests unitaires ne suffisaient pas.
- Correctif : les mèches suivent désormais la gravité à partir des racines latérales du crâne ; le matériau de la peau n'utilise plus l'atlas vestimentaire d'origine sur la surface corporelle vérifiée de 4 170 sommets.
- Ces changements seront à nouveau comparés à une capture visuelle et restent un prototype, pas un avatar photoréaliste approuvé.
