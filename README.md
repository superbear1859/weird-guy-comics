# The Weird Guy — Animated Comic Series

Hand-drawn animated SVG comics with Web Audio cartoon sound effects, by superbear1859.

Hosted on GitHub Pages with a zero-build static volume browser, reading progress tracking, and clean per-volume URLs.

## Project Structure

```text
weird-guy-comics/
├── index.html             # Volume browser & Continue Reading shelf
├── volumes.json           # Manifest listing all volumes (single source of truth)
├── .nojekyll              # Serves files directly on GitHub Pages without Jekyll
├── assets/
│   ├── reader.css         # Shared warm paper / comic theme
│   └── nav.js             # Shared top/bottom volume nav & localStorage progress
└── volumes/
    ├── _template/         # Starter template for new volumes
    ├── 01/index.html      # Volume #1: The Weird Guy
    └── 02/index.html      # Volume #2: We Are in a Book!
```

## Adding a New Volume (e.g., Volume #3)

1. **Create the volume folder** by copying the starter template:
   ```bash
   cp -r volumes/_template volumes/03
   ```
2. **Edit `volumes/03/index.html`**:
   - Update the title, badge number (`#3`), subtitle, and `data-volume-id="03"` on the `nav.js` script tag.
   - Replace the `<script>` comic engine with your new volume's scenes/SFX (or paste your new volume's script inside the shell).
3. **Register the volume in `volumes.json`** by appending an entry to `"volumes"`:
   ```json
   {
     "id": "03",
     "number": 3,
     "title": "Your Volume Title",
     "edition": "Edition Subtitle",
     "description": "Short summary shown on the library shelf.",
     "panels": 16,
     "duration": "1:00",
     "path": "volumes/03/",
     "badgeColor": "#F472B6",
     "coverAccent": "#7C3AED",
     "coverTag": "Vol. 3"
   }
   ```
4. **Commit & push to `main`** — GitHub Pages updates automatically, and the library shelf + Previous/Next volume navigation on all existing volumes will pick up Volume #3 automatically.

## Local Preview

Because `index.html` and `assets/nav.js` load `volumes.json` via `fetch`, preview locally with any static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
