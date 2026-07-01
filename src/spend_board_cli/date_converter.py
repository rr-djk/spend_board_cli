from __future__ import annotations

from datetime import date

FRENCH_MONTH_TO_NUMBER: dict[str, int] = {
    "JAN": 1,
    "FÉV": 2,
    "MAR": 3,
    "AVR": 4,
    "MAI": 5,
    "JUN": 6,
    "JUL": 7,
    "AOÛ": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DÉC": 12,
    "DEC": 12,
    "FEV": 2,
    "AOU": 8,
}


def convert_rbc_date_to_iso(rbc_date: str, statement_period: dict | None) -> str:
    """Convert RBC date like '15 DÉC' to ISO format '2020-12-15'."""
    parts = rbc_date.strip().split()
    if len(parts) != 2:
        return rbc_date

    try:
        day = int(parts[0])
    except ValueError:
        return rbc_date

    month = FRENCH_MONTH_TO_NUMBER.get(parts[1].upper())
    if month is None:
        return rbc_date

    if statement_period:
        end = statement_period["end"]
        start = statement_period["start"]
        end_year = int(end.split("-")[0])
        end_month = int(end.split("-")[1])
        start_year = int(start.split("-")[0])
        year = end_year if month == end_month else start_year
        return f"{year}-{month:02d}-{day:02d}"

    today = date.today()
    current_year = today.year
    current_month = today.month
    year = current_year - 1 if month > current_month else current_year
    return f"{year}-{month:02d}-{day:02d}"
