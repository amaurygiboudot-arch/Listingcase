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

## Bibliothèque visuelle

Au premier démarrage, SQLite crée 10 000 emplacements de métadonnées :

- 2 500 femme ;
- 2 500 homme ;
- 2 500 non-binaire ;
- 2 500 androgyne / fluide.

Chaque personnage reçoit un `personId` stable et sa propre bibliothèque. Les photos sont filtrées par personne, cadrage, lieu, tenue, activité, humeur et moment.

Les nouvelles images peuvent être générées localement par ComfyUI. Le workflow ComfyUI doit être exporté au format API et peut utiliser les placeholders `{{PROMPT}}`, `{{NEGATIVE_PROMPT}}` et `{{REFERENCE_IMAGE}}`. Aucune API image distante n'est utilisée.

Si aucune photo cohérente n'existe et que ComfyUI local n'est pas prêt, l'application l'indique dans le chat au lieu de retourner une image incohérente.

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
