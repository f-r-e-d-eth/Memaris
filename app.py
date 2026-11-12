import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
CONFIG_FILE = Path.home() / ".config" / "memaris" / "config.json"

def data_dir():
    try:
        configured = json.loads(CONFIG_FILE.read_text(encoding="utf-8")).get("data_path")
        if configured:
            path = Path(configured).expanduser().resolve()
            if path.is_dir():
                return path
    except (OSError, ValueError, TypeError, AttributeError):
        pass
    return DEFAULT_DATA_DIR.resolve()


def entries_dir():
    return data_dir() / "entries"


def legacy_log():
    return data_dir() / "logbook.txt"
BACKGROUND_DIR = BASE_DIR / "static" / "backgrounds"
RECURRENCES = {"none", "yearly", "biweekly", "weekly"}

app = Flask(__name__)


def ensure_storage():
    entries_dir().mkdir(parents=True, exist_ok=True)
    BACKGROUND_DIR.mkdir(parents=True, exist_ok=True)


def entry_path(entry_id):
    return entries_dir() / f"{entry_id}.json"


def parse_event_time(value, fallback):
    try:
        return datetime.fromisoformat(str(value)).isoformat(timespec="minutes")
    except (TypeError, ValueError):
        return fallback.isoformat(timespec="minutes")


def parse_recurrence(value):
    value = str(value or "none").lower()
    return value if value in RECURRENCES else "none"


def migrate_legacy_log():
    ensure_storage()
    if not legacy_log().exists() or list(entries_dir().glob("*.json")):
        return
    blocks = [b.strip() for b in legacy_log().read_text(encoding="utf-8").split("\n---\n") if b.strip()]
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
            "event_time": dt.isoformat(timespec="minutes"),
            "recurrence": "none",
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
    for path in entries_dir().glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            data["event_time"] = data.get("event_time") or data.get("created", "")
            data["recurrence"] = parse_recurrence(data.get("recurrence"))
            result.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return result


@app.get("/")
def index():
    return render_template("index.html")


@app.route("/api/folder", methods=["GET", "POST"])
def folder():
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        supplied = payload.get("path")
        if not isinstance(supplied, str) or not supplied.strip():
            return jsonify({"error": "Enter a folder path."}), 400
        path = Path(supplied.strip()).expanduser().resolve()
        if not path.is_dir():
            return jsonify({"error": "Folder does not exist."}), 400
        try:
            # Verify the folder is readable and writable before switching.
            entries = path / "entries"
            entries.mkdir(exist_ok=True)
            probe = entries / (".memaris-check-" + uuid4().hex)
            probe.write_text("", encoding="utf-8")
            probe.unlink()
            CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
            CONFIG_FILE.write_text(json.dumps({"data_path": str(path)}, indent=2), encoding="utf-8")
        except OSError as error:
            return jsonify({"error": f"Cannot use folder: {error}"}), 400
    path = data_dir()
    return jsonify({"path": str(path), "name": path.name})


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
        "event_time": parse_event_time(payload.get("event_time"), now),
        "recurrence": parse_recurrence(payload.get("recurrence")),
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
    now = datetime.now()
    data.update({
        "modified": now.isoformat(timespec="seconds"),
        "event_time": parse_event_time(payload.get("event_time"), datetime.fromisoformat(data.get("event_time") or data["created"])),
        "recurrence": parse_recurrence(payload.get("recurrence", data.get("recurrence", "none"))),
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
