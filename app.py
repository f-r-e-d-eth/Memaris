import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ENTRIES_DIR = DATA_DIR / "entries"
LEGACY_LOG = DATA_DIR / "logbook.txt"
BACKGROUND_DIR = BASE_DIR / "static" / "backgrounds"

app = Flask(__name__)


def ensure_storage():
    ENTRIES_DIR.mkdir(parents=True, exist_ok=True)
    BACKGROUND_DIR.mkdir(parents=True, exist_ok=True)


def entry_path(entry_id):
    return ENTRIES_DIR / f"{entry_id}.json"


def migrate_legacy_log():
    ensure_storage()
    if not LEGACY_LOG.exists() or list(ENTRIES_DIR.glob("*.json")):
        return
    blocks = [b.strip() for b in LEGACY_LOG.read_text(encoding="utf-8").split("\n---\n") if b.strip()]
    for block in blocks:
        lines = block.splitlines()
        if not lines or not (lines[0].startswith("[") and lines[0].endswith("]")):
            continue
        stamp = lines[0][1:-1]
        try:
            dt = datetime.strptime(stamp, "%Y-%m-%d %H:%M")
        except ValueError:
            dt = datetime.now()
        entry_id = dt.strftime("%Y%m%d-%H%M%S") + "-" + uuid4().hex[:6]
        data = {
            "id": entry_id,
            "created": dt.isoformat(timespec="seconds"),
            "modified": dt.isoformat(timespec="seconds"),
            "text": "\n".join(lines[1:]).strip(),
            "color": "#ffffff",
            "background": "",
            "glass": 72,
            "font_size": 22,
        }
        entry_path(entry_id).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_entries():
    migrate_legacy_log()
    result = []
    for path in ENTRIES_DIR.glob("*.json"):
        try:
            result.append(json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    return sorted(result, key=lambda e: e.get("created", ""), reverse=True)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/entries")
def entries():
    return jsonify(read_entries())


@app.post("/api/entries")
def create_entry():
    ensure_storage()
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Entry is empty."}), 400
    now = datetime.now()
    entry_id = now.strftime("%Y%m%d-%H%M%S") + "-" + uuid4().hex[:6]
    data = {
        "id": entry_id,
        "created": now.isoformat(timespec="seconds"),
        "modified": now.isoformat(timespec="seconds"),
        "text": text,
        "color": str(payload.get("color", "#ffffff")),
        "background": str(payload.get("background", "")),
        "glass": int(payload.get("glass", 72)),
        "font_size": int(payload.get("font_size", 22)),
    }
    entry_path(entry_id).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return jsonify(data), 201


@app.put("/api/entries/<entry_id>")
def update_entry(entry_id):
    path = entry_path(entry_id)
    if not path.exists():
        return jsonify({"error": "Entry not found."}), 404
    data = json.loads(path.read_text(encoding="utf-8"))
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Entry is empty."}), 400
    data.update({
        "modified": datetime.now().isoformat(timespec="seconds"),
        "text": text,
        "color": str(payload.get("color", data.get("color", "#ffffff"))),
        "background": str(payload.get("background", data.get("background", ""))),
        "glass": int(payload.get("glass", data.get("glass", 72))),
        "font_size": int(payload.get("font_size", data.get("font_size", 22))),
    })
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return jsonify(data)


@app.get("/api/backgrounds")
def backgrounds():
    ensure_storage()
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    return jsonify(sorted(f"/static/backgrounds/{p.name}" for p in BACKGROUND_DIR.iterdir() if p.is_file() and p.suffix.lower() in allowed))


if __name__ == "__main__":
    ensure_storage()
    app.run(host="127.0.0.1", port=5001, debug=True)
