# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static web app for tracking a Panini FIFA World Cup 2026 sticker collection. Deployed at `https://Crola1702.github.io/album-ac-ar/`.

## Local development

`data.js` is not committed (it's in `.gitignore`). Generate it before opening the app locally:

```bash
python3 build.py
```

Then open `index.html` directly in a browser (no server needed — it's a static page with no build step).

## Data flow

The two CSV files are the single source of truth:

- `monitas.csv` — one row per sticker: `ID,NOMBRE,COMPLETADO,EXTRA`. Sticker IDs are prefixed with the 3-letter country code (e.g. `ARG001`).
- `paises.csv` — one row per country: `CODIGO,NOMBRE`.

`build.py` reads both CSVs and writes `data.js`, which exports two JS globals: `PAISES` and `STICKERS`. CI runs the same logic inline in `.github/workflows/deploy.yml` and generates `data.js` at deploy time.

## Architecture

All app logic lives in three files:

- `index.html` — structure only; loads `data.js` then `app.js`.
- `app.js` — all runtime logic. State (toggle completado, extras) is stored in `localStorage` under `album-state`. The `state` object holds overrides keyed by sticker ID; `getStickerState()` merges CSV base data with any local override. "Exportar CSV" downloads the merged state as a new `monitas.csv` for the user to commit. "Resetear" clears `localStorage`.
- `style.css` — all styling.

If the data structure changes (new CSV columns, new sticker fields), update both `build.py` and the inline Python in `deploy.yml` — they must stay in sync.
