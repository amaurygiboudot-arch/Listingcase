# JULIE — Aperçu Android autonome 3D

Cette branche ajoute un **prototype Android hors ligne**, créé sans détruire l'ancien projet Human Partner.

## Contenu livré

- Modèle 3D **stylisé** d'une femme adulte blonde aux yeux verts ; animation de respiration, clignement, gestes, rotation tactile, changements de couleur de tenue.
- Scène 3D légère (chambre fictive), rendu adaptatif jusqu'à 120 FPS **maximum**.
- Interface mobile « Julie », « Parler », « Souvenirs », « Réglages ».
- Identité de référence : `JULIE_001` (nouvel espace de démonstration distinct de la base historique).
- Dialogue hors ligne **déterministe** (réponses modèles, pas une IA autonome).
- Conservation locale des messages et préférences de démo via SharedPreferences Android (ou localStorage dans un navigateur) ; export JSON manuel et effacement explicite.
- Pas de permission Internet, pas de serveur, pas d'achat, pas de compte externe.

## Limites et sécurité

Ceci est une prévisualisation, **pas l'avatar photoréaliste définitif**, ni la mémoire permanente complète définie par le document maître. Les données locales de cette démonstration ne sont pas chiffrées par l’application ni synchronisées. Évitez d'y mettre des secrets. La perte de l'application ou des données peut effacer cette mémoire de démonstration ; exportez-la avant toute désinstallation.

Ce prototype utilise un **applicationId Android distinct** (`com.julie.preview`) afin de ne pas remplacer l'ancienne application Human Partner et ses données. L'application Android historique et le backend Node/SQLite restent intacts dans le dépôt.

## Génération de l'APK

Le workflow `.github/workflows/julie-apk.yml` :

1. copie ces sources dans une version de compilation temporaire de `android/app` ;
2. installe temporairement `three` et `esbuild` puis crée le bundle 3D local ;
3. construit `app-debug.apk` avec Gradle ;
4. téléverse l'APK comme artefact `Julie-3D-APK` téléchargeable dans GitHub Actions.

Le workflow se lance automatiquement lorsqu'il est ajouté sur `julie-v1`, puis manuellement si nécessaire via `Run workflow`.

Pour préserver les anciens fichiers, **la compilation ne modifie pas les sources de l'application Human Partner**, uniquement la copie éphémère dans le runner GitHub Actions.
