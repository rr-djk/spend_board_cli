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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse RBC credit card statement PDF and append transactions to Excel."
    )
    parser.add_argument("pdf_path", type=str, help="Path to the RBC statement PDF")
    parser.add_argument("xlsx_path", type=str, help="Path to the output Excel file")
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path)
    xlsx_path = Path(args.xlsx_path)

    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    # Run the TypeScript parser
    data = run_parser(pdf_path)
    transactions = data.get("transactions", [])

    if not transactions:
        print("No transactions found in PDF.", file=sys.stderr)
        sys.exit(0)

    # Convert to output rows
    period = data.get("statementPeriod")
    rows = [
        TransactionRow(
            date=_convert_date(t["transactionDate"], period),
            merchant=t["description"],
            amount=t["amount"],
        )
        for t in transactions
    ]

    # Write to Excel
    append_to_excel(xlsx_path, rows)
    print(f"Appended {len(rows)} transactions to {xlsx_path}")


def _convert_date(rbc_date: str, period: dict | None) -> str:
    """Convert '15 DÉC' to ISO date using statement period for year inference."""
    from spend_board_cli.date_converter import convert_rbc_date_to_iso
    return convert_rbc_date_to_iso(rbc_date, period)


if __name__ == "__main__":
    main()
