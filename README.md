# Human Partner — architecture locale

Application de compagnon virtuel avec personnalité stable, mémoire persistante et bibliothèque visuelle indexée.

## Architecture actuelle

- frontend web sans framework ;
- backend Node.js 22 ;
- SQLite local via `node:sqlite` ;
- moteur de personnalité stable ;
- humeur quotidienne variable ;
- mémoire conversationnelle persistante ;
- confiance / affinité / relation évolutives ;
- autonomie sur les demandes concernant le personnage ;
- catalogue visuel de 10 000 emplacements ;
- connecteur LLM local compatible API OpenAI ;
- aucun fournisseur IA obligatoire.

## Lancer

```bash
npm start
```

Puis ouvrir :

```
http://localhost:8787
```

La base est créée automatiquement dans `data/human-partner.sqlite`.

## Cerveau local

Le mode normal est 100 % local. Sur la machine de développement actuelle :

```bash
ollama pull qwen3:1.7b
```

Puis :

```
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=qwen3:1.7b
LLM_API_KEY=
```

Human Partner détecte Ollama automatiquement et utilise son API native. Le modèle est préchauffé puis conservé en mémoire afin d'éviter de le recharger à chaque message.

Sans modèle disponible, l'application conserve un moteur de dialogue local simple. Aucun fournisseur cloud n'est requis.

## API principale

- `GET /api/state`
- `POST /api/adult`
- `POST /api/partner`
- `POST /api/chat`
- `POST /api/visual/select`
- `POST /api/reset`
- `GET /api/health`
- `GET /api/world/people` et `GET /api/world/knowledge`
- `POST /api/world/person`, `/api/world/relation`, `/api/world/event`, `/api/world/confide`, `/api/world/secret`, `/api/world/tell`

## Monde social et confidentialité

Le registre `world_*` conserve les personnages et leurs relations, les faits observés, les confidences, les secrets et les transmissions. Une relation ne transmet aucun fait automatiquement. Une transmission par `/api/world/tell` exige que le personnage connaisse déjà le fait ; les informations racontées portent une source et une certitude réduite. Les conversations brutes ne sont jamais copiées dans le registre social.

Le personnage actif reçoit uniquement ses propres faits connus dans le contexte du modèle. Les routes sociales suivent le même contrôle d'accès que les autres routes API. Le backend reste actuellement conçu pour une seule session utilisateur ; une authentification multi-utilisateur et le chiffrement des données restent nécessaires avant une publication publique.

Ce premier moteur ne décide pas encore tout seul quand un personnage révèle un secret ou lance une rumeur : le serveur doit déclencher explicitement `/api/world/tell` lors d'une action narrative. Il ne crée pas de personnages jouables supplémentaires dans l'interface actuelle.

## Bibliothèque visuelle

Au premier démarrage, SQLite crée 10 000 emplacements de métadonnées :

- 2 500 femme ;
- 2 500 homme ;
- 2 500 non-binaire ;
- 2 500 androgyne / fluide.

Chaque personnage reçoit un `personId` stable et sa propre bibliothèque. Les photos sont filtrées par personne, cadrage, lieu, tenue, activité, humeur et moment.

Le moteur image principal est maintenant `stable-diffusion.cpp` en CPU, avec DreamShaper-7 LCM quantifié. Il est lancé à la demande pour économiser la RAM. Avant une génération, Human Partner libère temporairement Qwen3, génère la photo localement, puis réchauffe Qwen3.

Le moteur choisit un cadrage adapté à la demande (portrait, selfie, three-quarter, fullbody, miroir) et réutilise la photo canonique du personnage en img2img quand elle existe afin de conserver au mieux son identité.

ComfyUI reste disponible comme moteur local alternatif. Aucune API image distante n'est nécessaire.

Si aucune photo cohérente n'existe et qu'aucun moteur local n'est disponible, l'application l'indique dans le chat au lieu de retourner une image incohérente.

## Avant une publication réelle

À ajouter :

1. authentification multi-utilisateur ;
2. véritable vérification d'âge adaptée aux pays ciblés ;
3. chiffrement des données sensibles ;
4. stockage objet pour les images ;
5. sauvegardes ;
6. journalisation / observabilité ;
7. connecteur de génération visuelle ;
8. moteur de résumé et consolidation mémoire ;
9. tests automatisés ;
10. conditions d'utilisation et politique de confidentialité.
