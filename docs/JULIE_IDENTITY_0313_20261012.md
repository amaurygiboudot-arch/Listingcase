# JULIE TEST 0.3.13 — identité et apparence

## Incident observé
Vidéo 8080.mp4 fournie par Amaury: à « À quoi tu ressembles », le 3B parle de ses capacités et termine par « pas vrai Julie ? ». La vidéo ne montre pas le début de l'attente; aucune mesure du délai initial déduite.

## Source et périmètre
Document maître V1.2 lu le 12 octobre 2026, tableau Identité initiale: Julie, 1,75 m, silhouette fine, cheveux blonds mi-longs, yeux verts, visage expressif.
Le document maître et les 22 décisions ne sont pas modifiés. Ce descriptif est la référence écrite de l'avatar, pas une analyse automatique de la photographie ni un corps physique.
Source et date de lecture explicites dans identity-reference.mjs. Aucune synchronisation Drive automatique annoncée.

## Corrections
- Questions simples sur apparence/taille/yeux/cheveux: réponse locale déterministe tirée de la référence, sans inference.
- Consigne 3B courte explicitant qui est Julie et qui est Amaury.
- Anciennes réponses présentant une inversion de prénom reconnue exclues du contexte envoyé au modèle, sans modification des archives.
- Adresses directes précises corrigées (« Bonjour Julie », fin « pas vrai Julie ? »); pas de remplacement global des noms dans les histoires.
- Le texte généré peut encore contenir d'autres erreurs; ces règles ne garantissent pas la cohérence générale d'un petit modèle.
- Optimisations natives de 0.3.12 et choix du 3B conservés.

## Tests
37 tests Node réussis: nouveaux cas de la vidéo, variantes de question, faux positifs, citations, absence d'inférence pour la fiche, conservation des messages, isolation des examens; non-régression ADN/mémoire/conversation/streaming.
Le pont Android est simulé dans ces tests. Test réel du modèle sur PC et paquet: résultats à consigner ci-dessous.
Aucun test de cette version sur le téléphone débranché.

## Limite du test réel PC
L'essai Ollama qwen2.5:3b du 12 octobre a dépassé le délai de 180 secondes sans résultat exploitable. Le bloc finally a demandé le déchargement du modèle et le processus s'est terminé avec code 1. Pas de réussite du modèle revendiquée. Les réponses documentaires sont vérifiées par la voie réelle localReply avec pont simulé; la consigne générale de prénom reste à valider sur téléphone.

## Livraison vérifiée
APK compilé avec succès en 9 min 3 s. Version 300009 / 0.3.13-identite-test, paquet com.julie.learning.experimental.
Fichier JULIE-TEST-0.3.13-identite.apk: 65 689 253 octets; SHA-256 7f32fec734a6ccee6daff8bc39cc6fbe51231409a099cc46bd52548104451fcc.
Signature identique aux mises à jour précédentes: certificat SHA-256 668bbf6dbcc590da70a37b0102a59407a3539f0146ccf24b68c3d0f6061499c2.
Copie transférée vérifiée par SHA-256 et intégrité ZIP. Bibliothèques natives strictement identiques à 0.3.12. Installation par-dessus l'existant, sans désinstallation ni téléchargement du modèle.
