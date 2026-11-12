# Memaris

**Capture today. Find tomorrow.**

Memaris is a small local, browser-based logbook for capturing everyday thoughts, events and memories on a simple timeline. It is designed to stay lightweight now and grow into a personal second brain later.

## Features

- Write and edit plain-text entries in the browser
- One local JSON file per entry in `data/entries/`
- Editable event date and time — past or future
- Recurring entries: yearly, every two weeks, or weekly
- Timeline with today, month and year separators
- Local background images with per-entry background, text color, font size and transparency
- No database, cloud service or AI required

## Run locally

```bash
git clone https://github.com/f-r-e-d-eth/Memaris.git
cd Memaris
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5001`.

To add your own backgrounds, place `.jpg`, `.jpeg`, `.png` or `.webp` files in `static/backgrounds/`.

## Your data stays local

Entries are stored locally in `data/entries/`. Journal entries and personal background images are intentionally excluded from Git by `.gitignore`, so they are not committed when you update or fork the project.

## Data philosophy

Original journal text is the source of truth. Future AI features should add interpretations, metadata, tags, links and search without silently rewriting the original entry.

## Status

Memaris is a small personal project and intentionally simple. The current version is already used as an everyday logbook; future versions may add better navigation, search and optional local AI features.

## Multiple data folders

Click the folder name at the top-right of the editor to select any existing local folder by its absolute path (for example `/home/user/Documents/Memaris-Work`). Memaris stores entries in an `entries/` subfolder of the selected directory, creating it if needed. The current folder is remembered in `~/.config/memaris/config.json`. The original `data/entries/` remains untouched and is the default when no custom folder is configured. The application must have permission to read and write the selected directory. Folder switching saves unsaved non-empty edits before loading the other timeline. Run Memaris locally only: the folder selection API grants filesystem access to the server process.
