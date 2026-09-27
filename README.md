# Memaris

**Capture today. Find tomorrow.**

Memaris is a local, browser-based logbook designed to grow into a personal second brain.

## V1

- Write plain-text entries in the browser
- Automatically timestamp every saved entry
- Store everything locally in `data/logbook.txt`
- Show entries newest-first
- Cycle through local background images
- Adjust panel transparency
- No database and no AI yet

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`.

## Data philosophy

Original journal text is the source of truth. Future AI features should add metadata, tags, links and search without silently rewriting original entries.

Personal log data and local background images are intentionally excluded from Git.
