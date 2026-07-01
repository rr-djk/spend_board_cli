from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from spend_board_cli.excel_writer import TransactionRow, append_to_excel


def find_parse_script() -> Path:
    """Locate parse.ts relative to the Python package."""
    return Path(__file__).parent.parent.parent / "parse.ts"


def run_parser(pdf_path: Path) -> dict:
    """Run the Node.js parser and return parsed data."""
    script = find_parse_script()
    if not script.exists():
        print(f"Error: parse.ts not found at {script}", file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(
        ["npx", "tsx", str(script), str(pdf_path)],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Parser error: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)

    # Extract JSON from output (skip warning lines from pdfjs-dist)
    for line in result.stdout.splitlines():
        line = line.strip()
        if line.startswith("{"):
            return json.loads(line)

    print("Error: no JSON output from parser", file=sys.stderr)
    sys.exit(1)


def collect_pdfs(input_path: Path) -> list[Path]:
    """Return a list of PDF paths from a file or directory."""
    if input_path.is_file():
        if input_path.suffix.lower() != ".pdf":
            print(f"Error: not a PDF file: {input_path}", file=sys.stderr)
            sys.exit(1)
        return [input_path]

    if input_path.is_dir():
        pdfs = sorted([p for p in input_path.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"])
        if not pdfs:
            print(f"No PDF files found in directory: {input_path}", file=sys.stderr)
            sys.exit(1)
        return pdfs

    print(f"Error: path not found: {input_path}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse RBC credit card statement PDF(s) and append transactions to Excel."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-f", "--file", type=str, dest="input_path", help="Path to a single RBC statement PDF")
    group.add_argument("-d", "--directory", type=str, dest="input_path", help="Path to a directory containing RBC statement PDFs")
    parser.add_argument("xlsx_path", type=str, help="Path to the output Excel file")
    args = parser.parse_args()

    input_path = Path(args.input_path)
    xlsx_path = Path(args.xlsx_path)

    if not input_path.exists():
        print(f"Error: path not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    pdf_paths = collect_pdfs(input_path)
    all_rows: list[TransactionRow] = []
    failed_files: list[Path] = []

    for pdf_path in pdf_paths:
        try:
            data = run_parser(pdf_path)
        except SystemExit:
            failed_files.append(pdf_path)
            continue
        except Exception as e:
            print(f"Error parsing {pdf_path}: {e}", file=sys.stderr)
            failed_files.append(pdf_path)
            continue

        transactions = data.get("transactions", [])
        if not transactions:
            continue

        period = data.get("statementPeriod")
        rows = [
            TransactionRow(
                date=_convert_date(t["transactionDate"], period),
                merchant=t["description"],
                amount=t["amount"],
            )
            for t in transactions
        ]
        all_rows.extend(rows)

    if failed_files:
        print("\nThe following files could not be parsed:", file=sys.stderr)
        for f in failed_files:
            print(f"  - {f}", file=sys.stderr)

    if not all_rows:
        print("No transactions found.", file=sys.stderr)
        sys.exit(1 if failed_files else 0)

    append_to_excel(xlsx_path, all_rows)
    print(f"Appended {len(all_rows)} transactions to {xlsx_path}")

    if failed_files:
        sys.exit(1)


def _convert_date(rbc_date: str, period: dict | None) -> str:
    """Convert '15 DÉC' to ISO date using statement period for year inference."""
    from spend_board_cli.date_converter import convert_rbc_date_to_iso
    return convert_rbc_date_to_iso(rbc_date, period)


if __name__ == "__main__":
    main()
