"""Refresh the public Korean stock code → official English name snapshot."""

import io
import json
import os
import re
import sys
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ENDPOINT = "https://opendart.fss.or.kr/api/corpCode.xml"
OUTPUT = Path(__file__).resolve().parents[1] / "public/data/kr-stock-english-names.json"


def read_stock_names(data):
    if not zipfile.is_zipfile(io.BytesIO(data)):
        status = re.search(rb"<status>([0-9]{3})</status>", data)
        raise ValueError(f"OpenDART returned status {status[1].decode()}" if status else "Invalid OpenDART archive")

    candidates = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entry = next(item for item in archive.infolist() if Path(item.filename).name.lower() == "corpcode.xml")
        if entry.file_size > 64 * 1024 * 1024:
            raise ValueError("OpenDART XML exceeds the expected size")
        with archive.open(entry) as document:
            for _, row in ET.iterparse(document, events=("end",)):
                if row.tag != "list":
                    continue
                code = row.findtext("stock_code", "").strip()
                if re.fullmatch(r"[0-9][A-Z0-9]{5}", code):
                    name = " ".join(row.findtext("corp_eng_name", "").split())
                    modified = row.findtext("modify_date", "").strip()
                    latest, names = candidates.get(code, ("", set()))
                    if modified > latest:
                        candidates[code] = (modified, {name})
                    elif modified == latest:
                        candidates[code] = (latest, names | {name})
                row.clear()
    return {code: next(iter(names)) for code, (_, names) in sorted(candidates.items())
            if len(names) == 1 and "" not in names}


def main():
    api_key = os.environ.get("OPENDART_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Set OPENDART_API_KEY before refreshing the snapshot")
    url = f"{ENDPOINT}?{urllib.parse.urlencode({'crtfc_key': api_key})}"
    with urllib.request.urlopen(url, timeout=60) as response:
        limit = 16 * 1024 * 1024
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("OpenDART ZIP exceeds the expected size")
    names = read_stock_names(data)
    if not names:
        raise ValueError("No listed companies with English names in the OpenDART archive")
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=OUTPUT.parent, delete=False) as temp:
        try:
            json.dump(names, temp, ensure_ascii=False, indent=2)
            temp.write("\n")
            temp.close()
            os.chmod(temp.name, 0o644)
            os.replace(temp.name, OUTPUT)
        finally:
            Path(temp.name).unlink(missing_ok=True)
    print(f"Saved {len(names)} official English names.")


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        sys.exit(str(error))
    except (OSError, StopIteration, zipfile.BadZipFile, ET.ParseError) as error:
        # An HTTP exception can contain the request URL with the API key.
        sys.exit(f"OpenDART refresh failed ({type(error).__name__})")
