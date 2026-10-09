# JULIE — Migration non destructive de Listingcase

## État contrôlé le 09/10/2026

- Source : `amaurygiboudot-arch/Listingcase`, branche `main`.
- HEAD observé : `2dd32af8cc90d772feeff1242b8ec871902efb49`.
- Baseline : Node.js 22+, SQLite `data/human-partner.sqlite`, interface web, personnages préconfigurés, mémoire vivante, tests `npm run check`, build Android existant **non 3D**.
- Statut d'accès : lecture GitHub disponible ; écriture via l'intégration refusée (HTTP 403). PC Remote Desktop « EDUCTOR » hors ligne.
- Aucune modification de GitHub, du PC, de la base de production, ni d'une application Android n'a été faite.

## Procédure dès qu'un accès d'écriture ou un poste est disponible

1. Faire une copie locale du dépôt et préserver l'historique de Git. Sur une machine disposant de Git :
   `git clone https://github.com/amaurygiboudot-arch/Listingcase.git` puis `cd Listingcase`.
2. Vérifier la branche `main`, que la copie est propre, et créer les branches distinctes :
   `git branch backup/human-partner-2026-10-09` puis `git switch -c feat/julie-migration-2026-10-09`.
3. Copier `tools/julie-spec.mjs` et `tools/prepare-julie.mjs` dans le sous-dossier `tools/` du dépôt.
4. Tester sans modifier : `node tools/prepare-julie.mjs`.
5. Appliquer localement : `node tools/prepare-julie.mjs --apply`.
   - Sauvegarde des fichiers originaux dans `data-backup-julie-*` (ignoré par Git).
   - Sauvegarde SQLite cohérente et vérifiée par `PRAGMA integrity_check` si `data/human-partner.sqlite` existe.
   - Ajout de `JULIE_001` **sans retirer** `CHLOE_001` ni aucune session.
   - Interface d'accueil renommée, bouton « Retrouver Julie ».
6. Vérifier `npm run check` et `npm start` avec un **répertoire DATA_DIR temporaire** avant tout usage réel.
7. Vérifier en UI : Julie existe après lancement, a 22 ans et l'apparence prévue, aucun souvenir commun inventé, sélection de Julie possible, identité stable après redémarrage, ancienne base intacte.
8. Comparer les modifications `git diff`, créer une PR ; ne fusionner qu'après CI verte et vérification manuelle de sauvegarde/restauration.

## Décisions délibérées

- Ne pas renommer immédiatement `human-partner.sqlite` : cela ferait paraître la mémoire disparue.
- Ne pas supprimer les personnages, conversations, visualisations ou fichiers antérieurs pendant cette première étape.
- Ne pas présenter comme implémentés l'autonomie complète, l'avatar Godot, le corps 3D anatomique ou l'APK 3D.
- Ne pas activer automatiquement un autre personnage si une session existante est ouverte ; une bascule explicite et contrôlée reste nécessaire.
- Les profils historiques peuvent être archivés après validation d'une sauvegarde/restauration, jamais par suppression silencieuse.
- Le dépôt est actuellement **public**. Ne pas y déposer de mots de passe, clés, conversations, journaux, souvenirs réels ou sauvegardes personnelles.
- Aucune dépense ni déploiement payant ne doit être engagé.

## Risques de l'ancienne application à traiter ensuite

1. Route de suppression de personnage pouvant effacer sessions et identité : ajouter une double confirmation et une sauvegarde vérifiée pour JULIE_001.
2. Multi-utilisateur et chiffrement applicatif non implémentés : **pas de publication publique**.
3. `startNewCharacter` vide les tables actives après snapshot ; tester précisément restauration, fichiers médias et rétablissement de personnages.
4. Les fichiers de référence et la documentation mentionnent Chloé et Human Partner ; les retirer seulement quand les anciennes données auront été archivées et les comportements testés.
5. Connexion au moteur Godot et export Android 3D : travail ultérieur, indépendant de la migration d'identité.
