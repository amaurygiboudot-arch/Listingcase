# JULIE — canal Android de développement (0.3.1)

**Source active sur `julie-v1`** : `julie-v3-genesis/`. Le nom du répertoire est hérité du premier prototype Genesis ; il n'implique pas la création d'une nouvelle APK à chaque mise à jour.

## Fonctionnement vérifiable
- Identité immuable **JULIE_001**, modèle femme adulte de base issu de la même ressource MakeHuman / MPFB CC0 que Genesis.
- Squelette et animation inclus dans le GLB, scène 3D hors ligne, plafond FPS économique 30, normal 60, élevé 120.
- Chat **hors ligne déterministe** : pas encore d'IA conversationnelle ni de mémoire cloud.
- Android WebView, origine HTTPS simulée par interception locale, pas de permission INTERNET.
- Journal des messages et souvenirs de démonstration sans troncature silencieuse ; plafond physique de 8 Mo vérifié avant écriture.
- Stockage privé Android **AES-256-GCM via AndroidKeyStore** ; une ancienne mémoire V3 enregistrée en clair est migrée uniquement après enregistrement chiffré confirmé.
- Export JSON explicite **non chiffré**, import validé et fusionné sans écraser le courant. Effacement horodaté : les anciens exports ne peuvent pas recréer silencieusement les éléments supprimés.
- Toute erreur de stockage refuse de remplacer l'ancien état. Les données de Genesis/Ève ne sont ni copiées ni modifiées.

## Source unique et compilation
Un seul workflow à utiliser pour les prochaines versions : `.github/workflows/julie-android.yml`.
Les anciens workflows et les anciennes versions doivent être considérés comme des archives/prototypes, à retirer uniquement après preuve du bon fonctionnement du nouveau canal.

Paquet Android de développement : `com.julie.preview.v3` (inchangé par rapport à Julie V3), code de version 13, nom 0.3.1. **Signature** : tant qu'une clé Android privée et persistante n'est pas configurée dans GitHub Actions, l'APK de test est signée avec une clé debug propre au runner. Une mise à jour par-dessus une ancienne installation peut être refusée. **Exporter les souvenirs avant toute désinstallation** puis importer volontairement l'export JSON. Une désinstallation efface la mémoire chiffrée AndroidKeyStore.

## Limites importantes
Cette application n'est pas une compagne pleinement autonome, ne possède pas de voix, de synchronisation sécurisée ni de monde persistant. Le corps utilise la même source GLB humanoïde que Genesis et seulement une première morphologie féminine adaptée : l'apparence exacte d'Ève (cheveux, yeux, texture peau, animations et morphs avancés) est encore à intégrer et doit être contrôlée visuellement.

## Sécurité et coût
Pas d'abonnement, pas de paiement, pas d'appel à une API payante, pas d'accès à un compte sensible. Les journaux GitHub Actions ne doivent jamais contenir de souvenir personnel ou de clé de signature. Aucun changement aux branches `main` ou `backup-human-partner-20261009`, ni au dépôt Genesis, dans ce canal.

Références : `Julie_Document_Maitre_V1.docx` (document de conception approuvé), `CREDITS_MODELE.md` (provenance et licence GLB).
