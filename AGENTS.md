# AGENTS.md

## Setup & install

```bash
npm install                    # Node.js deps (pdfjs-dist, tsx)
pip install -e ".[dev]"       # Python package + pytest
```

## Run

Single PDF:

```bash
python3 -m spend_board_cli -f <releve_rbc.pdf> <transactions.xlsx>
```

Batch directory:

```bash
python3 -m spend_board_cli -d <releves_directory> <transactions.xlsx>
```

Test the TypeScript parser in isolation:

```bash
npx tsx parse.ts <releve.pdf>
```

## Architecture

The project is a dual-language CLI: a Python entrypoint (`src/spend_board_cli/__main__.py`) shelling out to a TypeScript parser (`parse.ts`) via `npx tsx`.

The TS side extracts text from the PDF with `pdfjs-dist`, then runs custom Ruby/RBC parsers. The Python side reads the JSON stdout, converts French month names to ISO dates, and writes rows to Excel with `openpyxl`.

## Critical: local parser copies

The modules in `src/parsers/` and `src/pdf/` are **local copies** synced from the sibling `../spend_board` project. Do **not** modify them here unless you intend to break the sync. The source of truth lives in `../spend_board/frontend/src/utils/parsers/` and `../spend_board/frontend/src/utils/pdf/`.

## TypeScript quirks

- **No `tsconfig.json`** — `tsx` uses its own defaults. Imports in `parse.ts` use `.js` extensions because the code runs as ESM via `tsx`.
- **Polyfill required for Node.js < 22**: `parse.ts` polyfills `Promise.withResolvers` at the top. Do not remove it.
- **pdfjs-dist worker**: The worker path is resolved relative to `__dirname` → `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`. If the project structure changes, this path must be updated.
- **pdfjs-dist emits a legacy-build warning** to stderr — it is harmless and can be ignored.

## No tests

The `pyproject.toml` configures `pytest` (testpaths = `["tests"]`) but no tests exist yet. There is no test suite for the TypeScript code either.

## Only RBC supported

The bank detector (`src/parsers/bankDetector.ts`) returns `'unknown'` for any bank other than RBC, and `parse.ts` will exit with an error.
