from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LOG_FILE = DATA_DIR / "logbook.txt"
BACKGROUND_DIR = BASE_DIR / "static" / "backgrounds"

app = Flask(__name__)


def ensure_storage():
    DATA_DIR.mkdir(exist_ok=True)
    BACKGROUND_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE.touch(exist_ok=True)


def read_entries():
    ensure_storage()
    text = LOG_FILE.read_text(encoding="utf-8")
    blocks = [b.strip() for b in text.split("\n---\n") if b.strip()]
    entries = []
    for block in reversed(blocks):
        lines = block.splitlines()
        if not lines or not (lines[0].startswith("[") and lines[0].endswith("]")):
            continue
        entries.append({"timestamp": lines[0][1:-1], "text": "\n".join(lines[1:]).strip()})
    return entries


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/entries")
def entries():
    return jsonify(read_entries())


@app.post("/api/entries")
def add_entry():
    ensure_storage()
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Entry is empty."}), 400
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    separator = "" if LOG_FILE.stat().st_size == 0 else "\n---\n"
    with LOG_FILE.open("a", encoding="utf-8") as file:
        file.write(f"{separator}[{timestamp}]\n{text}\n")
    return jsonify({"timestamp": timestamp, "text": text}), 201


@app.get("/api/backgrounds")
def backgrounds():
    ensure_storage()
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    files = sorted(f"/static/backgrounds/{p.name}" for p in BACKGROUND_DIR.iterdir() if p.is_file() and p.suffix.lower() in allowed)
    return jsonify(files)


if __name__ == "__main__":
    ensure_storage()
    app.run(host="127.0.0.1", port=5000, debug=True)
