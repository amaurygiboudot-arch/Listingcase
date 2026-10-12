# JULIE TEST 0.3.7 — correction de cohérence

12 octobre 2026. Périmètre expérimental uniquement, sans modification du maître ni des 22 décisions.

## Changements

- Exemples fictifs de dialogue pour distinguer Amaury et Julie, affection, réalité et désaccord. Ils ne sont jamais ajoutés aux messages ni aux souvenirs.
- Sélection du contexte : anciens refus génériques « je suis une IA… ne peux pas… » après une demande affective exclus uniquement du contexte de génération. Archives intactes. Les explications après une question explicite de réalité restent dans le contexte.
- Réponses locales du profil pour les questions simples sur prénoms, nature virtuelle et principe d'indépendance. Ce ne sont PAS des générations du modèle. L'interface précise modèle local + profil.
- Réponse d'incertitude pour les demandes explicites de souvenirs communs, car la mémoire durable du projet n'est pas encore reliée au modèle. Aucun faux voyage enregistré.
- Examens sans exemples romantiques ni identité relationnelle. Moteur, modèle et stockage Android inchangés.

## Preuves

19 tests Node passent : contexte, profil, isolation examens, streaming, conservation/import/effacements. Budget du test de contexte augmenté de 1400 à 2000 caractères pour les exemples ; fenêtre d'historique reste quatre messages, chacun borné à 160 caractères. Plafond natif de tokens inchangé. Les assertions sur l'ancienne formulation du prompt ont été adaptées au nouveau texte, pas présentées comme tests de comportement.

Validation réelle du parcours localReply avec Ollama PC qwen2.5:1.5b, température zéro, raw ChatML, contexte 2048 : 8 scénarios indépendants avec les anciennes réponses de la capture, puis 6 tours enchaînés. Les 14 réponses finales sont cohérentes avec leurs scénarios. Parmi elles, 6 sont générées, 8 viennent du profil. Résultats enregistrés dans dialogue-release-check.json et dialogue-chain-check.json. L'historique fourni est vérifié inchangé par localReply.

Extraits réels : modèle → « Oui, mon cœur. » ; « Oui, je suis contente de te retrouver. » ; après explication de simulation, nouvel échange affectif → « Oui, mon cœur. ». Profil → « Tu t'appelles Amaury. » ; « Je m'appelle Julie, ta compagne virtuelle. » ; émotions simulées et droit au désaccord explicites.

Les premiers essais ont révélé des refus persistants, des inversions de nom, une fausse revendication d'émotions réelles, une affirmation d'accord systématique et un voyage inventé. Ces échecs ont motivé les réponses du profil et la gestion du contexte ; ils ne doivent pas être masqués par les succès finaux.

## Paquet et limites

Build Gradle offline réussi en 22 s. Package com.julie.learning.experimental, versionCode 300003, versionName 0.3.7-dialogue-test. Signature vérifiée et identique à 0.3.6. APK 65 663 873 octets ; SHA256 8da378e28c822d023484d4f1a7048806f94ca84acaf7173112b0bf0b28f69789. Transfert vérifié par la même empreinte.

Téléphone débranché : PAS de test JNI Android, de mesure de latence téléphone ni de validation de conservation après installation pour cette version. Le moteur PC n'est pas une preuve de sortie identique sur Android. Le petit modèle reste susceptible d'incohérences sur d'autres formulations et souvenirs implicites. Les réponses du profil couvrent les demandes explicites reconnues, pas une compréhension générale de toutes les paraphrases.

Aucune synchronisation Drive ou récupération intégrale des conversations ajoutée. Pas de publication, dépense ou mise en production. Mise à jour sur l'application TEST existante, sans désinstallation.
