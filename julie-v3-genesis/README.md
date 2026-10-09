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
