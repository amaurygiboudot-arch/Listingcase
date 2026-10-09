# JULIE — Avatar 3D V2 (prévisualisation autonome)

Cette branche ajoute une **V2 du prototype Android hors ligne**, construite sur le travail existant sans détruire Human Partner, Julie V1 ou leurs données.

## Contenu livré

- Modèle 3D **toujours stylisé**, mais reconstruit avec géométrie organique (surfaces continues pour la silhouette, doigts, yeux et visage détaillés, mèches de cheveux nuancées), animation de respiration, clignement, gestes, rotation tactile, changements de couleur de tenue.
- Scène 3D légère (chambre fictive), rendu adaptatif jusqu'à 120 FPS **maximum**.
- Interface mobile « Julie », « Parler », « Souvenirs », « Réglages ».
- Identité de référence : `JULIE_001` (nouvel espace de démonstration distinct de la base historique).
- Dialogue hors ligne **déterministe** (réponses modèles, pas une IA autonome).
- Conservation locale des messages et préférences de démo via SharedPreferences Android (ou localStorage dans un navigateur) ; export JSON manuel et effacement explicite.
- Pas de permission Internet, pas de serveur, pas d'achat, pas de compte externe.

## Limites et sécurité

Ceci est une prévisualisation, **pas l'avatar photoréaliste définitif**, ni la mémoire permanente complète définie par le document maître. Les données locales de cette démonstration ne sont pas chiffrées par l’application ni synchronisées. Évitez d'y mettre des secrets. La perte de l'application ou des données peut effacer cette mémoire de démonstration ; exportez-la avant toute désinstallation.

Cette V2 est installée **à côté de Julie V1** (sans importer automatiquement ses données) grâce à un **applicationId Android distinct** (`com.julie.preview.v2`) afin de ne pas remplacer l'ancienne application Human Partner et ses données. L'application Android historique et le backend Node/SQLite restent intacts dans le dépôt.

## Génération de l'APK

Le workflow `.github/workflows/julie-apk.yml` :

1. copie ces sources dans une version de compilation temporaire de `android/app` ;
2. installe temporairement `three` et `esbuild` puis crée le bundle 3D local ;
3. construit `app-debug.apk` avec Gradle ;
4. téléverse l'APK comme artefact `Julie-3D-APK` téléchargeable dans GitHub Actions.

Le workflow se lance automatiquement lorsqu'il est ajouté sur `julie-v1`, puis manuellement si nécessaire via `Run workflow`.

Pour préserver les anciens fichiers, **la compilation ne modifie pas les sources de l'application Human Partner**, uniquement la copie éphémère dans le runner GitHub Actions.

## Julie V1 et souvenirs

Julie V2 utilise un identifiant de paquet Android différent pour ne pas écraser les données enregistrées dans l’APK V1. Les messages de V1 restent dans V1 et ne sont **pas** automatiquement importés dans V2. Exportez la mémoire de démonstration depuis V1 avant de la désinstaller ; une importation encadrée sera ajoutée ensuite. L’identité conceptuelle de Julie reste `JULIE_001` dans les deux prototypes.

## Vérification

Le workflow V2 vérifie la syntaxe, la présence des fichiers de l’application, le profil `JULIE_001`, la compilation JS en fichier local, l’absence de permission Internet puis l’APK générée. Il n’engage aucune dépense et ne fusionne pas avec `main`.
