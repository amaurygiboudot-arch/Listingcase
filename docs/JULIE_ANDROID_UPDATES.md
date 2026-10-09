# JULIE — mises à jour Android contrôlées

## État fonctionnel (version 0.3.2)
Dans **Réglages → Mises à jour**, Julie recherche une Release GitHub dédiée à l'ouverture de l'application (au plus une fois par 24 h), vérifie les métadonnées, et télécharge automatiquement une APK **uniquement sur réseau non facturé** lorsque l'option est activée.

L'installation Android exige **toujours une action explicite** ; une application Android ordinaire ne peut pas installer silencieusement une APK téléchargée hors Play Store. Sur Android 8+, l'utilisateur peut avoir à autoriser cette source dans les paramètres.

## Source et garde-fous
- Dépôt autorisé : `amaurygiboudot-arch/Listingcase`.
- Release/tag dédiée : `julie-android-updates`.
- Fichier unique : `JULIE-Android.apk`.
- Métadonnées JSON dans le corps de la Release : `packageName`, `versionCode`, `versionName`, `sha256`, `notes`.
- Téléchargement validé par SHA-256, taille et **certificat de signature Android identique à l'installation existante**.
- Le contenu distant ne devient jamais du JavaScript WebView. Les souvenirs et messages ne sont pas envoyés à GitHub.
- L'absence de Release entraîne un état « Aucune mise à jour publiée ».

## Signature permanente — prérequis avant de distribuer
Le workflow `.github/workflows/julie-android.yml` fabrique toujours une APK debug pour vérifier le code. Il **ne distribue pas de Release de mise à jour** sans les secrets GitHub suivants :

1. `JULIE_ANDROID_KEYSTORE_BASE64` — keystore JKS/PKCS12 Android **privé**, encodé en base64.
2. `JULIE_ANDROID_STORE_PASSWORD` — mot de passe du keystore.
3. `JULIE_ANDROID_KEY_ALIAS` — alias de clé.
4. `JULIE_ANDROID_KEY_PASSWORD` — mot de passe de la clé.

Une fois ces quatre secrets correctement configurés, le workflow compile une APK **release signée** et la publie sur le tag permanent. Avant de remplacer la Release existante, il compare son certificat avec celui du nouvel APK et **bloque la publication** en cas de changement. Aucun secret n'est imprimé dans les logs ni commité dans le dépôt.

**Attention** : les APK debug antérieures avaient une clé temporaire propre au runner. Elles ne peuvent pas être mises à jour en place avec la nouvelle signature permanente. Avant la première migration, il faut exporter les souvenirs JSON, installer la nouvelle APK et importer volontairement l'export. Ce changement de signature ne doit pas être caché à l'utilisateur.

La clé permanente et ses mots de passe doivent être sauvegardés **séparément, dans un coffre-fort sécurisé**. Une perte de cette clé empêche les mises à jour directes.

## Option future Google Play
Si JULIE est distribuée sur Google Play, préférer les **mises à jour gérées par Google Play** (ou Play In-App Updates) ; retirer alors `REQUEST_INSTALL_PACKAGES` pour respecter la politique de distribution du Play Store.

## Aucun coût
Les tests et artefacts existants utilisent GitHub Actions selon les quotas du compte ; ne jamais activer un service payant, un abonnement ou une dépense sans autorisation explicite.

## Sécurité des souvenirs
Le stockage `JULIE_001` AndroidKeyStore reste privé à l'identifiant de l'application `com.julie.preview.v3`. La mise à jour avec la **même signature et le même identifiant Android** préserve normalement les données de l'application ; une **désinstallation** les détruit. Les exports JSON sont non chiffrés : conserver hors accès public.
