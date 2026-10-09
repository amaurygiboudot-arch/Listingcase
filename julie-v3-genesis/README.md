# JULIE V3 — Maillage humain d'origine Genesis / Ève

## Objectif
Remplacer la figurine stylisée des prototypes V1/V2 par un véritable maillage humanoïde texturé et skinné, basé sur le **même GLB MakeHuman/MPFB CC0 que le simulateur Genesis**. Julie conserve son identifiant `JULIE_001` et ses paramètres initiaux (22 ans, 1,75 m, silhouette fine).

## Ce que cette V3 fait réellement
- Télécharge le modèle source public `vsim/packages/assets/library/human.glb` pendant la compilation GitHub Actions et l'embarque localement dans l'APK (pas d'accès Internet à l'exécution).
- Animation GLB de repos, squelette d'animation existant (environ 53 os), rotation tactile, proportions à 1,75 m.
- Ajustement féminin **simplifié et prudent** reprenant la méthode de morphologie morphométrique de Genesis ; conserve les textures et les poids des os.
- Corrige les surfaces de peau parfois déclarées transparentes par erreur (problème déjà traité dans Genesis).
- Conserve la maquette Android (chat de démonstration hors ligne, export/import de souvenirs de test). Identifiant Android distinct `com.julie.preview.v3`.

## Ce qui reste à faire pour reproduire exactement Ève
Le modèle Genesis d'Ève n'est **pas** un second fichier GLB distinct. Genesis charge un modèle commun, puis applique de multiples modules : variantes anatomiques, visage, peau, morphs, cheveux, mouvements et état physiologique. La V3 réutilise la base et une première adaptation féminine, **pas encore l'ensemble** des adaptations d'Ève. Les cheveux blonds mi-longs et la couleur des iris nécessiteront une validation visuelle et des assets/contrôles supplémentaires. L'apparence n'est pas encore photoréaliste.

## Sécurité
Aucune donnée Genesis ou mémoire d'Ève n'est transférée ; aucun abonnement ni service payant ajouté. Le dépôt Genesis reste inchangé. Le prototype ne synchronise pas avec le vrai moteur de mémoire de Human Partner. Exporter les souvenirs de V1/V2/V2.1 avant désinstallation : aucune importation silencieuse. Ne pas stocker d'informations sensibles dans la mémoire de démonstration non chiffrée.

## Source et licence
Voir `CREDITS_MODELE.md`. La source humaine CC0 est publique ; toute future texture tierce devra faire l'objet d'une vérification de licence distincte.

## Compilation
Ajouter `.github/workflows/julie-v3-genesis.yml` à la branche `julie-v1`. GitHub Actions vérifie le GLB, effectue les tests JS et compile l'APK. Si le téléchargement public échoue, l'installation échoue explicitement plutôt que de retomber sur un mannequin géométrique trompeur.
