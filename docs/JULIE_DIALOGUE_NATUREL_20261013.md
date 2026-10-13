# JULIE — dialogue naturel, correctif expérimental (13/10/2026)

## Périmètre et autorité
- Départ : JULIE Learning **0.3.16-coherence-test**, branche `feat/julie-dialogue-coherence-20261012` (PR #4).
- Objectif : permettre à JULIE de s'exprimer plus naturellement selon le contexte, en gardant son caractère indépendant.
- Respect des **22 décisions du document maître** : identité stable JULIE_001, couple virtuel établi, mémoire tracée, autonomie fonctionnelle, consentement et transparence.
- Ne pas confondre cette application avec l'ancien canal `julie-v1` / `com.julie.preview.v3`.

## Modification limitée
- `www/local-conversation.mjs` : consigne Qwen 3B revue. La contrainte fixe d'une ou deux phrases est supprimée. Longueur adaptée aux messages simples ou aux demandes complexes ; davantage de naturel, d'humour, de désaccord et d'initiative, sans surnoms/questions/excuses systématiques.
- `www/dialogue-context.mjs` : même correction pour la variante 1,5B de secours.
- `tests/natural-dialogue-20261013.test.mjs` : nouveaux scénarios de contrôle du prompt, de la distinction entre dialogue personnel / technique / examen et de l'absence de modification du contexte par la construction du prompt.

**Non modifiés** : ID et ADN `JULIE_001`, fichiers de stockage, messages, mémoire, permissions, Android Java/C++, paquet, versionCode, signature, modèle local, avatar, workflows et algorithme de lecture/écriture.

## Statut et limites
Les instructions sont des contraintes de génération, **pas** une garantie qu'un modèle local 3B parlera exactement comme un grand modèle conversationnel. Une plus grande richesse du ton peut ralentir ou dégrader certaines réponses ; cela doit être mesuré sur le vrai téléphone.

EDUCTOR était hors ligne au moment de la préparation. **La nouvelle suite Node et la compilation Android n'ont pas été exécutées**, et aucune APK n'a été produite, installée, publiée ni déployée par ce changement. Les 114 tests de la PR #4 concernent la version antérieure, pas cette modification.

La PR #4 signale un risque encore ouvert : les jetons affichés en streaming peuvent précéder les filtres de la réponse finale. Ce changement de style ne résout pas ce problème.

## Vérification préalable à toute installation
1. Quand EDUCTOR revient en ligne, retrouver la copie exacte du code testé et vérifier le commit / l'APK installée, le paquet et le certificat.
2. Exécuter les tests Node existants et le nouveau test, inspecter les régressions et contrôler la longueur du prompt ainsi que la latence sur le Qwen 3B réel.
3. Tester des conversations suivies synthétiques : tendresse non automatique, humour, opinion divergente, message bref, explication technique détaillée, absence de faux souvenir et transparence sur les émotions simulées.
4. Corriger séparément les tokens transitoires non filtrés avant toute diffusion si ce défaut est reproductible.
5. Sauvegarder et vérifier les souvenirs et l'ADN avant une mise à jour Android. Ne jamais désinstaller ni migrer les données sans accord explicite.

**Budget additionnel : 0 €**. La branche d'essai et la PR de revue ne lancent pas le workflow Android, limité à `julie-v1`, ni le CI `main`.

**Statut : patch de code expérimental proposé à la revue ; aucune validation utilisateur de l'APK.**
