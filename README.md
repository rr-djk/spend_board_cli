# spend_board_cli

Parse les relevés de carte de crédit RBC (PDF) et ajoute les transactions dans un fichier Excel.

La logique de parsing est partagée avec l'application web [spend_board](../spend_board) — `parse.ts` importe directement les parsers TypeScript depuis `../spend_board/frontend/src/utils/parsers/`, il n'y a donc aucune logique dupliquée.

## Prérequis

- Python 3.10+
- Node.js 20+

## Installation

```bash
# Installer les dépendances Node.js (pdfjs-dist, tsx)
npm install

# Installer le package Python en mode dev (inclut pytest)
pip install -e ".[dev]"
```

## Utilisation

```bash
python3 -m spend_board_cli <releve_rbc.pdf> <transactions.xlsx>
```

- Si `transactions.xlsx` n'existe pas, il est créé avec une ligne d'en-tête.
- S'il existe, les transactions sont ajoutées à la fin.

Vous pouvez aussi tester le pont de parsing directement :

```bash
npx tsx parse.ts releve.pdf
```

Cela affiche en JSON dans stdout les transactions parsées.

## Format de sortie

Fichier Excel avec 3 colonnes :

| Colonne   | Format                          | Exemple        |
|-----------|---------------------------------|----------------|
| Date      | Date ISO (AAAA-MM-JJ)           | `2024-12-15`   |
| Marchant  | Nom du marchand                 | `TIM HORTON`   |
| Montant   | Nombre (négatif = paiement/crédit) | `-45.00`    |

## Fonctionnement

1. Le CLI Python appelle `parse.ts` via un sous-processus (`npx tsx`)
2. `parse.ts` utilise `pdfjs-dist` pour extraire le texte du PDF, puis exécute les parsers RBC du frontend spend_board
3. Le parser retourne du JSON (banque, période du relevé, transactions)
4. Python convertit les dates (noms de mois en français comme `15 DÉC` → `2024-12-15`), puis écrit les lignes dans Excel via `openpyxl`

## Structure du projet

```
spend_board_cli/
├── package.json              # Dépendances Node.js (pdfjs-dist, tsx)
├── parse.ts                  # Pont : importe les parsers TS depuis ../spend_board
├── pyproject.toml            # Configuration du CLI Python
└── src/spend_board_cli/
    ├── __init__.py
    ├── __main__.py           # Point d'entrée du CLI
    ├── date_converter.py     # "15 DÉC" → "2020-12-15"
    └── excel_writer.py       # Créer/ajouter dans Excel
```

## Notes

- Seuls les relevés RBC sont supportés — les autres banques sont rejetées par le détecteur de banque.
- La détection des doublons n'est pas gérée ; gérez la déduplication dans Excel vous-même.
- Le message `Warning: Please use the 'legacy' build in Node.js environments.` de pdfjs-dist est sans conséquence.
