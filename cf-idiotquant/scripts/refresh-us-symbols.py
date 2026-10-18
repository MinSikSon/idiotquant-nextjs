"""Refresh search symbols from KIS's official overseas stock masters (Python 3 + curl)."""
import argparse
import csv
import hashlib
import io
import json
import subprocess
from pathlib import Path
from zipfile import ZipFile

MARKETS = {"nasdaq": "nas", "nyse": "nys", "amex": "ams"}
OUTPUT = Path(__file__).resolve().parents[1] / "public/data/usStockSymbols"
SOURCE = "https://new.real.download.dws.co.kr/common/master/{}mst.cod.zip"


def parse_master(archive, code):
    with ZipFile(io.BytesIO(archive)) as zipped:
        member = next(name for name in zipped.namelist() if name.lower() == f"{code}mst.cod")
        info = zipped.getinfo(member)
        text = zipped.read(member).decode("cp949")
    entries = {}
    for row in csv.reader(io.StringIO(text), delimiter="\t", quoting=csv.QUOTE_NONE):
        if not row:
            continue
        if len(row) != 24 or row[2].strip() != code.upper():
            raise ValueError(f"Unexpected {code} master format")
        if row[8].strip() not in {"2", "3", "4"}:
            continue  # Indices are not stocks, ETPs or warrants.
        symbol, name = row[4].strip(), row[7].strip()
        if not symbol or not name or symbol in entries:
            raise ValueError(f"Invalid or duplicate {code} symbol: {symbol}")
        entries[symbol] = {"symbol": symbol, "name": name, "koreanName": row[6].strip()}
    if not entries:
        raise ValueError(f"Empty {code} master")
    date = "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}".format(*info.date_time)
    return [entries[symbol] for symbol in sorted(entries)], date


def refresh(source_dir=None):
    # Validate all three archives before replacing any checked-in data.
    output = {}
    metadata = {"provider": "Korea Investment & Securities", "markets": {}}
    seen = set()
    for market, code in MARKETS.items():
        url = SOURCE.format(code)
        if source_dir:
            archive = (Path(source_dir) / f"{code}mst.cod.zip").read_bytes()
        else:
            archive = subprocess.run(
                ["curl", "--fail", "--silent", "--show-error", "--location", "--max-time", "30", url],
                check=True, stdout=subprocess.PIPE,
            ).stdout
        entries, modified = parse_master(archive, code)
        symbols = [entry["symbol"] for entry in entries]
        if seen.intersection(symbols):
            raise ValueError(f"Duplicate symbols across markets: {market}")
        seen.update(symbols)
        output[f"{market}_tickers.json"] = symbols
        output[f"{market}_full_tickers.json"] = entries
        metadata["markets"][market] = {
            "source": url,
            "masterModifiedAt": modified,
            "sha256": hashlib.sha256(archive).hexdigest(),
            "count": len(entries),
        }
    output["metadata.json"] = metadata
    for filename, data in output.items():
        (OUTPUT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    for market, details in metadata["markets"].items():
        print(f"{market}: {details['count']} symbols ({details['masterModifiedAt']})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Read downloaded nas/nys/amsmst.cod.zip files instead of downloading")
    refresh(parser.parse_args().source_dir)
