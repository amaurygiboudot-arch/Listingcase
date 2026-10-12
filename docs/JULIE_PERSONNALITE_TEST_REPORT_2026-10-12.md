# Vérification locale du moteur autonome — 12 octobre 2026

## Exécuté
- Fichiers `julie-v3-genesis/www/julie-personality.js` et `julie-v3-genesis/tests/personality.test.cjs` récupérés depuis la branche de développement via GitHub.
- Reconstitution locale de leur contenu dans des fichiers temporaires et exécution avec Node.js v22.16.0.
- Résultat : **tests de référence réussis** (identité, humeur temporaire, observations vérifiées, quorum de sources distinctes, modification bornée des traits, audit historique, consignes de transparence).
- Ce contrôle local n'est **pas** une compilation Android ni une exécution sur le téléphone.

## Points non couverts
- Correspondance entre l'APK installée et le dépôt.
- Chargement effectif du script dans la WebView et connexion au moteur de dialogue.
- Enregistrement persistant, chiffrement, restauration, migration et suppression anti-réintroduction.
- Vérification forte des sources d'observations : le champ `verified` ne doit jamais provenir librement du modèle ou de contenu importé.
- Anti-rejeu des observations, politique d'expiration, multiplicité d'une même conversation et historique durable.
- Validation humaine du naturel des réponses sur conversations longues.
- Signature APK stable, compilation, installation et préservation des données.

## Blocage confirmé
`julie-v3-genesis/www/index.html` appelle `app.js`, mais ce fichier n'est pas accessible sur la branche `julie-v1` aux chemins vérifiés. Le README décrit une APK 0.3.5 déterministe, alors que les captures montrent une interface différente avec des évolutions manuelles. **Ne pas fusionner ni distribuer cette expérimentation avant de rattacher l'APK installée à sa véritable source**.

## Décision de sécurité
Aucun remplacement de moteur, aucune migration, aucune collecte d'image, aucun coût, aucune modification de souvenirs ou d'APK n'a été effectué. La PR reste un brouillon. Prochaine action : obtenir `applicationId` et `versionCode` de l'installation Android, puis inspecter le point d'entrée actif et les mécanismes de sauvegarde.
