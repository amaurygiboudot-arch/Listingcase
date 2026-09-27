# Human Partner — MVP

Prototype web autonome d'un compagnon virtuel avec personnalité stable et relation évolutive.

## Fonctionnalités actuelles

- contrôle d'accès 18+ déclaratif ;
- choix des types de personnes susceptibles d'attirer l'utilisateur ;
- création aléatoire d'une personnalité qui reste persistante ;
- humeur quotidienne variable sans rerandomiser la personnalité ;
- valeurs, humour, travail, sport, hobbies, pudeur et style d'attachement ;
- confiance et relation progressives ;
- réactions spécifiques aux demandes de photos ;
- autonomie du personnage : il peut accepter, négocier ou refuser ;
- mémoire locale via localStorage ;
- zone bibliothèque visuelle prête à être reliée à un catalogue d'images.

## Lancer localement

Aucune dépendance n'est nécessaire.

Ouvrir directement index.html, ou utiliser un serveur statique :

python -m http.server 8080

Puis ouvrir http://localhost:8080.

## Prochaines étapes

1. remplacer le moteur de dialogue local par un LLM ;
2. stocker personnages, mémoire et relation dans une base de données ;
3. connecter le catalogue visuel et le moteur de sélection d'images ;
4. ajouter authentification et véritable age assurance ;
5. ajouter comptes utilisateurs, chiffrement et sauvegardes ;
6. déployer le frontend et l'API.

Le fichier de règles complet du projet reste la source de vérité du futur moteur de personnalité.
