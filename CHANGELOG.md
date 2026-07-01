# Changelog

Toutes les modifications notables de ce projet seront documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/spec/v2.0.0.html).

## [0.2.0] - 2026-07-01

### Ajouté
- **Parsing par lot (batch)** : support du traitement d'un répertoire entier de relevés PDF via l'option `-d` / `--directory`.
- **Nouvelle interface CLI** : remplacement de l'argument positionnel `pdf_path` par un groupe d'options mutuellement exclusives `-f` (fichier unique) et `-d` (répertoire).
- **Gestion gracieuse des erreurs en mode batch** : les fichiers en échec sont listés à la fin sans interrompre le traitement des autres relevés.
- **Documentation interne** : ajout de `AGENTS.md` avec l'architecture, les commandes et les conventions du projet.
- **Suivi des dettes techniques** : ajout de `todos.md` pour tracer les bugs connus (ex. : parsing de l'année des transactions anciennes).

### Modifié
- Le fichier `.gitignore` ne ignore plus `AGENTS.md` afin de versionner la documentation agent-facing.

### Technique
- Refactor majeur de `__main__.py` : introduction de `collect_pdfs()` et d'une boucle de traitement indépendante par fichier.

## [0.1.0] - 2026-06-30

### Ajouté
- Version initiale : parsing d'un relevé de carte de crédit RBC unique et ajout des transactions dans un fichier Excel.
- Détection automatique de la banque via `bankDetector.ts` (uniquement RBC supporté).
- Conversion des dates françaises (`15 DÉC`) en dates ISO via l'inférence de l'année à partir de la période du relevé.
- Dual-langage Python / TypeScript : Python orchestre le parsing, TypeScript extrait le texte du PDF avec `pdfjs-dist`.
