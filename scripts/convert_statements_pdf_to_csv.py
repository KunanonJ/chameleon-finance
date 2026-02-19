#!/usr/bin/env python3
"""
Batch convert bank statement PDFs to CSV.

Outputs:
- One CSV per source PDF under Statement/CSV/... (mirrors Statement/Categorized layout)
  using a uniform import schema: Date,Description,Debit,Credit,Balance
- A combined import CSV at Statement/CSV/all_transactions_for_import.csv
- A conversion report at Statement/CSV/conversion_report.json
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "Statement" / "Categorized"
OUTPUT_ROOT = ROOT / "Statement" / "CSV"


ACCT_LINE_RE = re.compile(
    r"^(?P<date>\d{2}/\d{2}/\d{2})\s+"
    r"(?P<time>\d{2}:\d{2})\s+"
    r"(?P<code>[A-Z0-9]+)\s+"
    r"(?P<channel>[A-Z0-9]+)\s+"
    r"(?P<amount>-?\d[\d,]*\.\d{2})\s+"
    r"(?P<balance>-?\d[\d,]*\.\d{2})"
    r"(?P<desc>.*)$"
)

KTC_LINE_RE = re.compile(
    r"^(?P<tdate>\d{2}/\d{2}/\d{2})\s+"
    r"(?P<pdate>\d{2}/\d{2}/\d{2})\s+"
    r"(?P<desc>.+?)\s+"
    r"(?P<amount>-?\s?\d[\d,]*\.\d{2})$"
)

CARDX_LINE_RE = re.compile(
    r"^(?P<pdate>\d{2}/\d{2})\s+"
    r"(?P<tdate>\d{2}/\d{2})\s+"
    r"(?P<desc>.+?)\s+"
    r"(?P<fc>[A-Z]{3})\s+"
    r"(?P<fa>\d[\d,]*\.\d{2})\s+"
    r"(?P<amount>\d[\d,]*\.\d{2})$"
)

CARDX_LOCAL_LINE_RE = re.compile(
    r"^(?P<pdate>\d{2}/\d{2})\s+"
    r"(?P<tdate>\d{2}/\d{2})\s+"
    r"(?P<desc>.+?)\s+"
    r"(?P<amount>-?\d[\d,]*\.\d{2})$"
)

UOB_LINE_RE = re.compile(
    r"^(?P<pdate>\d{2}\s+[A-Z]{3})\s+"
    r"(?P<tdate>\d{2}\s+[A-Z]{3})\s+"
    r"(?P<desc>.+?)\s+"
    r"(?:(?P<fc>[A-Z]{3})\s*(?P<fa>\d[\d,]*\.\d{2})\s+)?"
    r"(?P<amount>\d[\d,]*\.\d{2})\s*"
    r"(?P<crdr>CR|DR)?$"
)

HEADER_GUARDS = (
    "DATE DESCRIPTION DEBIT CREDIT",
    "POST DATE TRANS DATE DESCRIPTION",
    "TRANSACTION DATE",
    "POSTING DATE",
    "TOTAL BALANCE",
    "SUB TOTAL",
    "PAGE ",
)

MONTHS = {
    "JAN": "01",
    "FEB": "02",
    "MAR": "03",
    "APR": "04",
    "MAY": "05",
    "JUN": "06",
    "JUL": "07",
    "AUG": "08",
    "SEP": "09",
    "OCT": "10",
    "NOV": "11",
    "DEC": "12",
}


@dataclass
class LineRecord:
    page: int
    line: str


def clean_text_line(line: str) -> str:
    s = (line or "")
    s = s.replace("\u2212", "-").replace("\u2013", "-").replace("\u2014", "-").replace("\u2011", "-").replace("\u00ad", "-")
    return " ".join(s.strip().split())


def parse_amount(value: str) -> Optional[float]:
    s = (value or "").strip().replace(",", "")
    s = s.replace("\u2212", "-").replace("\u2013", "-").replace("\u2014", "-").replace("\u2011", "-").replace("\u00ad", "-")
    s = s.replace(" ", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fmt_amount(value: Optional[float]) -> str:
    if value is None:
        return ""
    return f"{value:.2f}"


def yy_to_yyyy(yy: str) -> str:
    # Statement set is modern data (20xx).
    return f"20{yy}"


def dmy_to_iso(date_str: str) -> str:
    parts = date_str.split("/")
    if len(parts) != 3:
        return ""
    d, m, y = parts
    y = y if len(y) == 4 else yy_to_yyyy(y)
    return f"{y}-{m.zfill(2)}-{d.zfill(2)}"


def dm_text_to_iso(dm_text: str, fallback_year: str) -> str:
    parts = dm_text.strip().split()
    if len(parts) != 2:
        return ""
    day, mon = parts
    mon_num = MONTHS.get(mon.upper())
    if not mon_num:
        return ""
    return f"{fallback_year}-{mon_num}-{day.zfill(2)}"


def dm_slash_to_iso(dm_text: str, fallback_year: str) -> str:
    parts = dm_text.split("/")
    if len(parts) != 2:
        return ""
    d, m = parts
    return f"{fallback_year}-{m.zfill(2)}-{d.zfill(2)}"


def file_year_hint(pdf_path: Path) -> str:
    for part in pdf_path.parts:
        if re.fullmatch(r"\d{4}", part):
            return part
    return "2026"


def read_pdf_lines(pdf_path: Path) -> List[LineRecord]:
    records: List[LineRecord] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            for raw_line in text.splitlines():
                line = clean_text_line(raw_line)
                if line:
                    records.append(LineRecord(page=page_idx, line=line))
    return records


def can_open_pdf(pdf_path: Path) -> bool:
    try:
        _ = read_pdf_lines(pdf_path)
        return True
    except Exception:
        return False


def find_unlocked_twin(source_pdf: Path) -> Optional[Path]:
    parts = list(source_pdf.parts)
    if "locked_or_original" not in parts:
        return None

    idx = parts.index("locked_or_original")
    parts[idx] = "unlocked"
    unlocked_dir = Path(*parts[:-1])
    name = source_pdf.name
    stem = source_pdf.stem

    candidates = []
    if not stem.endswith("_unlocked"):
        candidates.append(unlocked_dir / f"{stem}_unlocked.pdf")
    candidates.append(unlocked_dir / name)

    for candidate in candidates:
        if candidate.exists() and can_open_pdf(candidate):
            return candidate
    return None


def should_skip_line(line_upper: str) -> bool:
    return any(token in line_upper for token in HEADER_GUARDS)


def parse_transaction_line(
    line_record: LineRecord,
    source_pdf: Path,
    extraction_pdf: Path,
) -> Optional[Dict[str, str]]:
    line = line_record.line
    upper = line.upper()
    if should_skip_line(upper):
        return None

    fallback_year = file_year_hint(source_pdf)

    m = ACCT_LINE_RE.match(line)
    if m:
        code = m.group("code")
        amount = parse_amount(m.group("amount"))
        debit = amount if code == "X2" else None
        credit = amount if code == "X1" else None
        return {
            "posted_date": dmy_to_iso(m.group("date")),
            "transaction_date": dmy_to_iso(m.group("date")),
            "time": m.group("time"),
            "description": (m.group("desc") or "").strip(),
            "debit": fmt_amount(debit),
            "credit": fmt_amount(credit),
            "balance": fmt_amount(parse_amount(m.group("balance"))),
            "currency": "THB",
            "foreign_amount": "",
            "code": code,
            "channel": m.group("channel"),
            "parse_method": "acct",
            "raw_line": line,
            "page": str(line_record.page),
            "source_pdf": str(source_pdf),
            "extracted_from_pdf": str(extraction_pdf),
        }

    m = CARDX_LINE_RE.match(line)
    if m:
        amount = parse_amount(m.group("amount"))
        if amount is None:
            return None
        debit = amount if amount >= 0 else None
        credit = abs(amount) if amount < 0 else None
        return {
            "posted_date": dm_slash_to_iso(m.group("pdate"), fallback_year),
            "transaction_date": dm_slash_to_iso(m.group("tdate"), fallback_year),
            "time": "",
            "description": m.group("desc").strip(),
            "debit": fmt_amount(debit),
            "credit": fmt_amount(credit),
            "balance": "",
            "currency": "THB",
            "foreign_amount": fmt_amount(parse_amount(m.group("fa"))),
            "code": "",
            "channel": "",
            "parse_method": "cardx",
            "raw_line": line,
            "page": str(line_record.page),
            "source_pdf": str(source_pdf),
            "extracted_from_pdf": str(extraction_pdf),
        }

    m = CARDX_LOCAL_LINE_RE.match(line)
    if m:
        amount = parse_amount(m.group("amount"))
        if amount is None:
            return None
        debit = amount if amount >= 0 else None
        credit = abs(amount) if amount < 0 else None
        return {
            "posted_date": dm_slash_to_iso(m.group("pdate"), fallback_year),
            "transaction_date": dm_slash_to_iso(m.group("tdate"), fallback_year),
            "time": "",
            "description": m.group("desc").strip(),
            "debit": fmt_amount(debit),
            "credit": fmt_amount(credit),
            "balance": "",
            "currency": "THB",
            "foreign_amount": "",
            "code": "",
            "channel": "",
            "parse_method": "cardx_local",
            "raw_line": line,
            "page": str(line_record.page),
            "source_pdf": str(source_pdf),
            "extracted_from_pdf": str(extraction_pdf),
        }

    m = UOB_LINE_RE.match(line)
    if m:
        amount = parse_amount(m.group("amount"))
        crdr = (m.group("crdr") or "").upper()
        debit = amount if crdr != "CR" else None
        credit = amount if crdr == "CR" else None
        return {
            "posted_date": dm_text_to_iso(m.group("pdate"), fallback_year),
            "transaction_date": dm_text_to_iso(m.group("tdate"), fallback_year),
            "time": "",
            "description": m.group("desc").strip(),
            "debit": fmt_amount(debit),
            "credit": fmt_amount(credit),
            "balance": "",
            "currency": "THB",
            "foreign_amount": fmt_amount(parse_amount(m.group("fa") or "")),
            "code": crdr,
            "channel": "",
            "parse_method": "uob",
            "raw_line": line,
            "page": str(line_record.page),
            "source_pdf": str(source_pdf),
            "extracted_from_pdf": str(extraction_pdf),
        }

    m = KTC_LINE_RE.match(line)
    if m:
        amount = parse_amount(m.group("amount"))
        if amount is None:
            return None
        debit = amount if amount >= 0 else None
        credit = abs(amount) if amount < 0 else None
        return {
            "posted_date": dmy_to_iso(m.group("pdate")),
            "transaction_date": dmy_to_iso(m.group("tdate")),
            "time": "",
            "description": m.group("desc").strip(),
            "debit": fmt_amount(debit),
            "credit": fmt_amount(credit),
            "balance": "",
            "currency": "THB",
            "foreign_amount": "",
            "code": "",
            "channel": "",
            "parse_method": "ktc",
            "raw_line": line,
            "page": str(line_record.page),
            "source_pdf": str(source_pdf),
            "extracted_from_pdf": str(extraction_pdf),
        }

    return None


def write_csv(path: Path, rows: Iterable[Dict[str, str]], fieldnames: List[str]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fieldnames})
            count += 1
    return count


def source_to_output_csv(source_pdf: Path) -> Path:
    rel = source_pdf.relative_to(SOURCE_ROOT)
    return (OUTPUT_ROOT / rel).with_suffix(".csv")


def normalize_for_import(row: Dict[str, str]) -> Dict[str, str]:
    date = row.get("transaction_date") or row.get("posted_date")
    description = row.get("description", "")
    return {
        "Date": date,
        "Description": description,
        "Debit": row.get("debit", ""),
        "Credit": row.get("credit", ""),
        "Balance": row.get("balance", ""),
    }


def has_import_amount(import_row: Dict[str, str]) -> bool:
    debit = (import_row.get("Debit") or "").strip()
    credit = (import_row.get("Credit") or "").strip()
    return bool(debit or credit)


def main() -> None:
    pdf_paths = sorted(SOURCE_ROOT.rglob("*.pdf"))

    import_fieldnames = ["Date", "Description", "Debit", "Credit", "Balance"]

    all_import_rows: List[Dict[str, str]] = []
    all_import_seen: set[Tuple[str, str, str, str, str]] = set()
    report_rows: List[Dict[str, str]] = []

    for source_pdf in pdf_paths:
        extraction_pdf = source_pdf
        status = "direct"

        if not can_open_pdf(source_pdf):
            twin = find_unlocked_twin(source_pdf)
            if twin is None:
                output_csv = source_to_output_csv(source_pdf)
                write_csv(output_csv, [], import_fieldnames)
                report_rows.append({
                    "source_pdf": str(source_pdf),
                    "status": "unreadable_no_twin",
                    "extracted_from_pdf": "",
                    "import_rows": "0",
                    "parsed_rows_before_filter": "0",
                    "scanned_lines": "0",
                    "output_csv": str(output_csv),
                })
                continue
            extraction_pdf = twin
            status = "used_unlocked_twin"

        lines = read_pdf_lines(extraction_pdf)

        parsed_rows: List[Dict[str, str]] = []
        seen_keys: set[Tuple[str, str, str, str, str]] = set()
        for rec in lines:
            parsed = parse_transaction_line(rec, source_pdf, extraction_pdf)
            if not parsed:
                continue
            dedupe_key = (
                parsed.get("posted_date", ""),
                parsed.get("transaction_date", ""),
                parsed.get("description", ""),
                parsed.get("debit", ""),
                parsed.get("credit", ""),
            )
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)
            parsed_rows.append(parsed)

        import_rows: List[Dict[str, str]] = []
        for row in parsed_rows:
            import_row = normalize_for_import(row)
            if not has_import_amount(import_row):
                continue
            import_rows.append(import_row)

        output_csv = source_to_output_csv(source_pdf)
        write_csv(output_csv, import_rows, import_fieldnames)

        for import_row in import_rows:
            key = (
                import_row["Date"],
                import_row["Description"],
                import_row["Debit"],
                import_row["Credit"],
                import_row["Balance"],
            )
            if key in all_import_seen:
                continue
            all_import_seen.add(key)
            all_import_rows.append(import_row)

        status_suffix = "" if import_rows else "_no_import_rows"
        report_rows.append({
            "source_pdf": str(source_pdf),
            "status": f"{status}{status_suffix}",
            "extracted_from_pdf": str(extraction_pdf),
            "import_rows": str(len(import_rows)),
            "parsed_rows_before_filter": str(len(parsed_rows)),
            "scanned_lines": str(len(lines)),
            "output_csv": str(output_csv),
        })

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    write_csv(OUTPUT_ROOT / "all_transactions_for_import.csv", all_import_rows, import_fieldnames)
    report_json_path = OUTPUT_ROOT / "conversion_report.json"
    with report_json_path.open("w", encoding="utf-8") as f:
        json.dump(report_rows, f, ensure_ascii=False, indent=2)

    legacy_report_csv = OUTPUT_ROOT / "conversion_report.csv"
    if legacy_report_csv.exists():
        legacy_report_csv.unlink()

    print(f"Converted {len(pdf_paths)} PDFs.")
    print(f"Per-file CSVs: {OUTPUT_ROOT}")
    print(f"Combined import CSV: {OUTPUT_ROOT / 'all_transactions_for_import.csv'}")
    print(f"Report JSON: {report_json_path}")


if __name__ == "__main__":
    main()
