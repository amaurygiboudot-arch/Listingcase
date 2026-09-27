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

## Brancher un modèle local

Copier `.env.example` vers `.env` ou définir les variables dans le terminal :

```
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=<nom-du-modele>
LLM_API_KEY=
```

Le backend utilise `POST /chat/completions`. Il peut donc être relié à un serveur local proposant une API compatible OpenAI.

Sans modèle configuré, l'application continue de fonctionner avec un moteur de dialogue local simple.

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

Les fichiers image réels ne sont pas générés automatiquement. Le moteur classe les emplacements selon le personnage, l'humeur, la relation et la continuité visuelle.

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
